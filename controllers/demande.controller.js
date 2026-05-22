const demandeModel = require('../models/demande.model');
const userModel = require('../models/user.model');
const donModel = require('../models/don.model');
const { createDemandeSchema, updateDemandeSchema } = require('../schemas/demande.schema');
const { saveLog } = require('../utils/logger');
const { notifyUser, notifyRole } = require('../utils/notify');

async function createDemande(req, res) {
  try {
    const validation = createDemandeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const demande = await demandeModel.create({
      ...req.body,
      femme: req.user._id
    });

    await saveLog({
      action: `${req.user.firstName} a créé une demande d'aide`,
      actorId: req.user._id
    });

    // Notify admins and associations of the new request
    await notifyRole(
      ['ADMINISTRATEUR', 'ASSOCIATION'],
      `Nouvelle demande d'aide soumise par ${req.user.firstName} ${req.user.lastName}${req.user.telephone ? ` (📞 ${req.user.telephone})` : ''}.`,
      'demande_nouvelle',
      '/demandes'
    );

    // Confirm to the femme herself
    await notifyUser(
      req.user._id,
      `Votre demande d'aide a été soumise avec succès. Elle est en attente de validation.`,
      'demande_en_attente',
      '/femme/demandes'
    );

    res.status(201).json({
      status: true,
      message: 'Demande créée avec succès',
      demande
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function listDemandes(req, res) {
  try {
    const filter = {};

    if (req.user.role === 'FEMME MALADE') {
      // FEMME MALADE voit toujours et uniquement ses propres demandes
      filter.femme = req.user._id;
    } else if (req.user.role === 'BENEVOLE') {
      // BENEVOLE voit uniquement les demandes validées et ouvertes (pas encore prises en charge)
      filter.statut = 'VALIDEE';
    } else if (req.user.role === 'DONATEUR' || req.user.role === 'DONTEUR') {
      // DONATEUR voit les demandes en attente ET validées (exclut refusées et terminées)
      filter.statut = { $in: ['EN_ATTENTE', 'VALIDEE'] };
    } else if (req.query.femme) {
      filter.femme = req.query.femme;
    }

    if ((req.user.role !== 'DONATEUR' && req.user.role !== 'DONTEUR') && req.query.statut) {
      filter.statut = req.query.statut;
    }

    const demandes = await demandeModel
      .find(filter)
      .populate('femme', 'firstName lastName email role telephone region')
      .populate('validePar', 'firstName lastName email role')
      .populate({ path: 'don', select: 'statut donateur', populate: { path: 'donateur', select: '_id' } })
      .sort({ createdAt: -1 });

    res.status(200).json({ status: true, demandes });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getDemande(req, res) {
  try {
    const demande = await demandeModel
      .findById(req.params.id)
      .populate('femme', 'firstName lastName email role telephone')
      .populate('validePar', 'firstName lastName email role')
      .populate('don');

    if (!demande) {
      return res.status(404).json({ status: false, message: 'Demande introuvable' });
    }

    if (req.user.role === 'FEMME MALADE') {
      const femmeId = demande.femme?._id?.toString() || demande.femme?.toString();
      if (femmeId !== req.user._id.toString()) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette demande' });
      }
    }

    res.status(200).json({ status: true, demande });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function updateDemande(req, res) {
  try {
    const validation = updateDemandeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const demande = await demandeModel.findById(req.params.id);

    if (!demande) {
      return res.status(404).json({ status: false, message: 'Demande introuvable' });
    }

    const updatedDemande = await demandeModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await saveLog({
      action: `${req.user.firstName} a modifié une demande`,
      actorId: req.user._id
    });

    res.status(200).json({
      status: true,
      message: 'Demande mise à jour avec succès',
      demande: updatedDemande
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function deleteDemande(req, res) {
  try {
    const demande = await demandeModel.findById(req.params.id);

    if (!demande) {
      return res.status(404).json({ status: false, message: 'Demande introuvable' });
    }

    await demandeModel.findByIdAndDelete(req.params.id);

    await saveLog({
      action: `${req.user.firstName} a supprimé une demande`,
      actorId: req.user._id
    });

    res.status(200).json({
      status: true,
      message: 'Demande supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function changeDemandeStatus(req, res) {
  try {
    const { statut } = req.body;

    const allowed = ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'EN_COURS', 'TERMINEE'];
    if (!allowed.includes(statut)) {
      return res.status(400).json({ status: false, message: 'Statut invalide' });
    }

    const demande = await demandeModel.findById(req.params.id);
    if (!demande) {
      return res.status(404).json({ status: false, message: 'Demande introuvable' });
    }

    demande.statut = statut;
    demande.validePar = req.user._id;
    await demande.save();

    // Cascade don status when demande is refused or finished
    if (demande.don) {
      if (statut === 'REFUSEE') {
        await donModel.findByIdAndUpdate(demande.don, { statut: 'REFUSE' });
      } else if (statut === 'TERMINEE') {
        await donModel.findByIdAndUpdate(demande.don, { statut: 'CONFIRME' });
      }
    }

    await saveLog({
      action: `${req.user.firstName} a changé le statut d'une demande à ${statut}`,
      actorId: req.user._id
    });

    const statusMessages = {
      VALIDEE:   { msg: "Votre demande d'aide a été validée.",              type: 'demande_acceptee',  lien: '/mes-demandes' },
      REFUSEE:   { msg: "Votre demande d'aide a été refusée.",              type: 'demande_rejetee',   lien: '/mes-demandes' },
      EN_COURS:  { msg: "Votre demande d'aide est en cours de traitement.", type: 'demande_en_cours',  lien: '/mes-demandes' },
      TERMINEE:  { msg: "Votre demande d'aide a été clôturée.",             type: 'demande_terminee',  lien: '/mes-demandes' },
    };
    const notif = statusMessages[statut];
    if (notif) {
      await notifyUser(demande.femme, notif.msg, notif.type, notif.lien);
    }
    // Alert admins about pending requests needing attention
    if (statut === 'EN_ATTENTE') {
      await notifyRole('ADMINISTRATEUR', "Une demande est en attente de validation.", 'demande_en_attente', '/demandes');
    }

    res.status(200).json({
      status: true,
      message: 'Statut mis à jour',
      demande
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

module.exports = {
  createDemande,
  listDemandes,
  getDemande,
  updateDemande,
  deleteDemande,
  changeDemandeStatus
};