const affectationModel = require('../models/affectation.model');
const demandeModel = require('../models/demande.model');
const { createAffectationSchema, updateAffectationSchema } = require('../schemas/affectation.schema');
const { saveLog } = require('../utils/logger');
const { notifyUser, notifyRole } = require('../utils/notify');

async function createAffectation(req, res) {
  try {
    const validation = createAffectationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    // If a demande is provided, auto-resolve the femme from it
    const payload = { ...req.body };
    if (payload.demande && !payload.femme) {
      const demande = await demandeModel.findById(payload.demande).select('femme');
      if (demande?.femme) payload.femme = demande.femme;
    }

    const affectation = await affectationModel.create(payload);

    await saveLog({
      action: `${req.user.firstName} a créé une affectation`,
      actorId: req.user._id
    });

    // Notify the bénévole they have been assigned
    if (req.body.benevole) {
      await notifyUser(
        req.body.benevole,
        'Vous avez été affecté(e) à une action solidaire.',
        'affectation',
        '/mes-affectations'
      );
    }

    res.status(201).json({
      status: true,
      message: 'Affectation créée avec succès',
      affectation
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function listAffectations(req, res) {
  try {
    const filter = {};

    if (req.user.role === 'BENEVOLE') {
      filter.benevole = req.user._id;
    }

    if (req.user.role === 'FEMME MALADE') {
      const femmesDemandes = await demandeModel.find({ femme: req.user._id }).select('_id');
      const demandeIds = femmesDemandes.map((d) => d._id);
      // Match via direct femme field (new) OR via linked demande (fallback for old records)
      filter.$or = [
        { femme: req.user._id },
        { demande: { $in: demandeIds } }
      ];
    }

    const affectations = await affectationModel.find(filter)
      .populate('benevole', 'firstName lastName email role competences')
      .populate('action')
      .populate({
        path: 'demande',
        populate: { path: 'femme', select: '_id firstName lastName' }
      });

    res.status(200).json({ status: true, affectations });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getAffectation(req, res) {
  try {
    const affectation = await affectationModel.findById(req.params.id)
      .populate('benevole', 'firstName lastName email role competences')
      .populate('action')
      .populate({
        path: 'demande',
        populate: { path: 'femme', select: '_id firstName lastName' }
      });

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    res.status(200).json({ status: true, affectation });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function updateAffectation(req, res) {
  try {
    const validation = updateAffectationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const affectation = await affectationModel.findById(req.params.id);

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    const updated = await affectationModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await saveLog({
      action: `${req.user.firstName} a modifié une affectation`,
      actorId: req.user._id
    });

    res.status(200).json({
      status: true,
      message: 'Affectation mise à jour avec succès',
      affectation: updated
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function deleteAffectation(req, res) {
  try {
    const affectation = await affectationModel.findById(req.params.id);

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    await affectationModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: 'Affectation supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function confirmerParticipation(req, res) {
  try {
    const affectation = await affectationModel.findById(req.params.id);

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    affectation.statut = 'ACCEPTEE';
    await affectation.save();

    res.status(200).json({
      status: true,
      message: 'Participation confirmée avec succès',
      affectation
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function changeAffectationStatus(req, res) {
  try {
    const { statut } = req.body;
    const allowed = ['EN_ATTENTE', 'ACCEPTEE', 'TERMINEE'];

    if (!allowed.includes(statut)) {
      return res.status(400).json({ status: false, message: 'Statut invalide' });
    }

    const affectation = await affectationModel.findById(req.params.id);

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    affectation.statut = statut;
    await affectation.save();

    await saveLog({
      action: `${req.user.firstName} a changé le statut d'une affectation à ${statut}`,
      actorId: req.user._id
    });

    // Notify bénévole of participation confirmation or cancellation
    const affectStatusMap = {
      ACCEPTEE: { msg: 'Votre participation à une action solidaire a été confirmée.', type: 'participation_confirmee' },
      TERMINEE: { msg: 'L\'action solidaire à laquelle vous participiez est terminée.', type: 'participation_confirmee' },
    };
    const affectNotif = affectStatusMap[statut];
    if (affectNotif && affectation.benevole) {
      await notifyUser(affectation.benevole, affectNotif.msg, affectNotif.type, '/mes-affectations');
    }

    res.status(200).json({
      status: true,
      message: 'Statut mis à jour',
      affectation
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

module.exports = {
  createAffectation,
  listAffectations,
  getAffectation,
  updateAffectation,
  deleteAffectation,
  confirmerParticipation,
  changeAffectationStatus
};