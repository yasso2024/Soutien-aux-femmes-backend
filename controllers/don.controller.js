const donModel = require('../models/don.model');
const demandeModel = require('../models/demande.model');
const propositionAideModel = require('../models/propositionAide.model');
const { createDonSchema, updateDonSchema } = require('../schemas/don.schema');
const { saveLog } = require('../utils/logger');
const { notifyUser, notifyRole } = require('../utils/notify');

async function createDon(req, res) {
  try {
    const validation = createDonSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const don = await donModel.create({
      ...req.body,
      donateur: req.user._id
    });

    if (req.body.demande) {
      await demandeModel.findByIdAndUpdate(req.body.demande, { don: don._id });
    }

    await saveLog({
      action: `${req.user.firstName} a effectué un don`,
      actorId: req.user._id
    });

    // Confirm to the donor that the donation was recorded
    await notifyUser(
      req.user._id,
      'Votre don a bien été enregistré. Merci pour votre générosité !',
      'don_enregistre',
      '/mes-dons'
    );
    // Alert admins
    await notifyRole(
      'ADMINISTRATEUR',
      `Un nouveau don de ${req.user.firstName} ${req.user.lastName} a été enregistré.`,
      'activite_importante',
      '/dons'
    );

    res.status(201).json({
      status: true,
      message: 'Don créé avec succès',
      don
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function listDons(req, res) {
  try {
    const filter = {};

    if (req.user.role === 'DONATEUR' || req.user.role === 'DONTEUR') {
      // Donateur sees only their own donations — query param cannot override this
      filter.donateur = req.user._id;
    } else if (req.query.donateur) {
      filter.donateur = req.query.donateur;
    }

    if (req.query.statut) {
      filter.statut = req.query.statut;
    }

    const dons = await donModel.find(filter)
      .populate('donateur', 'firstName lastName email role')
      .populate({
        path: 'demande',
        populate: {
          path: 'femme',
          select: 'firstName lastName email role avatar'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ status: true, dons });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getDon(req, res) {
  try {
    const don = await donModel.findById(req.params.id)
      .populate('donateur', 'firstName lastName email role')
      .populate({
        path: 'demande',
        populate: {
          path: 'femme',
          select: 'firstName lastName email role avatar'
        }
      });

    if (!don) {
      return res.status(404).json({ status: false, message: 'Don introuvable' });
    }

    if (req.user.role === 'DONATEUR' || req.user.role === 'DONTEUR') {
      const ownerId = don.donateur?._id?.toString() || don.donateur?.toString();
      if (ownerId !== req.user._id.toString()) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à ce don' });
      }
    }

    res.status(200).json({ status: true, don });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function updateDon(req, res) {
  try {
    const validation = updateDonSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const don = await donModel.findById(req.params.id);
    if (!don) {
      return res.status(404).json({ status: false, message: 'Don introuvable' });
    }

    const updatedDon = await donModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Sync demande backref: if demande changed, update demande.don
    const newDemandeId = req.body.demande;
    if (newDemandeId !== undefined) {
      // Remove this don from the old demande (if any)
      if (don.demande && don.demande.toString() !== (newDemandeId || '').toString()) {
        await demandeModel.findByIdAndUpdate(don.demande, { $unset: { don: 1 } });
      }
      // Link this don to the new demande
      if (newDemandeId) {
        await demandeModel.findByIdAndUpdate(newDemandeId, { don: updatedDon._id });
      }
    }

    await saveLog({
      action: `${req.user.firstName} a modifié un don`,
      actorId: req.user._id,
    });

    res.status(200).json({
      status: true,
      message: 'Don mis à jour avec succès',
      don: updatedDon
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function confirmDon(req, res) {
  try {
    const don = await donModel.findById(req.params.id);
    if (!don) {
      return res.status(404).json({ status: false, message: 'Don introuvable' });
    }

    don.statut = 'CONFIRME';
    await don.save();

    // When the don is confirmed, automatically validate the linked demande
    if (don.demande) {
      await demandeModel.findByIdAndUpdate(
        don.demande,
        { statut: 'VALIDEE', validePar: don.donateur },
        { new: true }
      );
    }

    // Notify the donor their donation was confirmed
    await notifyUser(
      don.donateur,
      'Votre don a été confirmé et validé. Merci pour votre soutien !',
      'don_confirme',
      '/mes-dons'
    );

    res.status(200).json({
      status: true,
      message: 'Don confirmé avec succès',
      don
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function changeDonStatus(req, res) {
  try {
    const { statut } = req.body;
    const allowed = ['EN_ATTENTE', 'CONFIRME', 'REFUSE'];

    if (!allowed.includes(statut)) {
      return res.status(400).json({ status: false, message: 'Statut invalide' });
    }

    const don = await donModel.findById(req.params.id);
    if (!don) {
      return res.status(404).json({ status: false, message: 'Don introuvable' });
    }

    don.statut = statut;
    await don.save();

    // When confirmed, automatically validate the linked demande
    if (statut === 'CONFIRME' && don.demande) {
      await demandeModel.findByIdAndUpdate(
        don.demande,
        { statut: 'VALIDEE', validePar: req.user._id },
        { new: true }
      );
    }

    // When refused, free the linked demande so another donor can finance it
    if (statut === 'REFUSE' && don.demande) {
      await demandeModel.findByIdAndUpdate(don.demande, { $unset: { don: 1 } });
    }

    await saveLog({
      action: `${req.user.firstName} a changé le statut d'un don à ${statut}`,
      actorId: req.user._id,
    });

    // Notify the donor of status changes
    const donStatusMessages = {
      CONFIRME: { msg: 'Votre don a été confirmé et validé. Merci !',        type: 'don_confirme' },
      REFUSE:   { msg: 'Votre don n\'a pas pu être validé. Contactez-nous.', type: 'don_refuse'   },
    };
    const donNotif = donStatusMessages[statut];
    if (donNotif) {
      await notifyUser(don.donateur, donNotif.msg, donNotif.type, '/mes-dons');
    }

    res.status(200).json({ status: true, message: 'Statut mis à jour', don });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function deleteDon(req, res) {
  try {
    const don = await donModel.findById(req.params.id);
    if (!don) {
      return res.status(404).json({ status: false, message: 'Don introuvable' });
    }

    await donModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: 'Don supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getDonatorStats(req, res) {
  try {
    const donatorId = req.user._id;

    // All dons for this donor with full demande populate (statut + femme)
    const dons = await donModel.find({ donateur: donatorId }).populate({
      path: 'demande',
      select: 'statut femme titre',
      populate: { path: 'femme', select: '_id' },
    });

    // Exclude REFUSE dons from all stats – a refused don is not a confirmed contribution
    const activeDons = dons.filter((d) => d.statut !== 'REFUSE');
    const totalMontant = activeDons.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);

    // Forward reference: femmes linked via confirmed/pending dons only
    const femmeIdsForward = activeDons
      .filter((d) => d.demande?.femme)
      .map((d) => (d.demande?.femme?._id || d.demande?.femme || '').toString())
      .filter(Boolean);

    // Forward reference: directly financed demande IDs (non-refused)
    const demandeIdsForward = activeDons
      .map((d) => (d.demande?._id || d.demande || '').toString())
      .filter(Boolean);

    // Reverse reference: demandes that have `don` pointing to one of this donateur's active dons
    const donIds = activeDons.map((d) => d._id);
    const demandesByBackref = donIds.length
      ? await demandeModel.find({ don: { $in: donIds } }).select('_id femme')
      : [];

    const femmeIdsBackref = demandesByBackref
      .filter((d) => d.femme)
      .map((d) => d.femme.toString());

    const demandeIdsBackref = demandesByBackref.map((d) => d._id.toString());

    // All distinct femmes this donateur has helped (any direction)
    const allFemmeIds = [...new Set([...femmeIdsForward, ...femmeIdsBackref])];
    const allDirectDemandeIds = [...new Set([...demandeIdsForward, ...demandeIdsBackref])];

    const femmesAidees = allFemmeIds.length;

    // All demandes belonging to those femmes (broadened scope for propositions)
    const allDemandesForFemmes = allFemmeIds.length
      ? await demandeModel.find({ femme: { $in: allFemmeIds } }).select('_id')
      : [];
    const allFemmeDemandeIds = allDemandesForFemmes.map((d) => d._id);

    // Propositions liées = any proposition for any demand of a femme this donateur helped
    const propositionsLiees = allFemmeDemandeIds.length
      ? await propositionAideModel.countDocuments({ demande: { $in: allFemmeDemandeIds } })
      : 0;

    res.status(200).json({
      status: true,
      stats: {
        totalDons: activeDons.length,
        totalMontant,
        donsConfirmes: activeDons.filter((d) => d.statut === 'CONFIRME').length,
        demandesFinancees: allDirectDemandeIds.length,
        femmesAidees,
        propositionsLiees,
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getDonatorPropositions(req, res) {
  try {
    const donatorId = req.user._id;

    const dons = await donModel.find({ donateur: donatorId }).populate({
      path: 'demande',
      select: '_id femme',
    });

    // Only non-refused dons count — refused dons have no business effect
    const activeDons = dons.filter((d) => d.statut !== 'REFUSE');

    // Femme IDs via forward reference (don.demande.femme)
    const femmeIdsForward = activeDons
      .filter((d) => d.demande?.femme)
      .map((d) => (d.demande.femme._id || d.demande.femme).toString());

    // Reverse reference: demandes whose `don` field points to this donateur's active dons
    const donIds = activeDons.map((d) => d._id);
    const demandesByBackref = donIds.length
      ? await demandeModel.find({ don: { $in: donIds } }).select('_id femme')
      : [];
    const femmeIdsBackref = demandesByBackref
      .filter((d) => d.femme)
      .map((d) => d.femme.toString());

    // All distinct femmes helped
    const allFemmeIds = [...new Set([...femmeIdsForward, ...femmeIdsBackref])];

    if (!allFemmeIds.length) {
      return res.status(200).json({ status: true, propositions: [] });
    }

    // All demandes for those femmes
    const allDemandes = await demandeModel.find({ femme: { $in: allFemmeIds } }).select('_id');
    const allDemandeIds = allDemandes.map((d) => d._id);

    if (!allDemandeIds.length) {
      return res.status(200).json({ status: true, propositions: [] });
    }

    const propositions = await propositionAideModel.find({ demande: { $in: allDemandeIds } })
      .populate('association', 'firstName lastName nomOrganisation avatar')
      .populate({
        path: 'demande',
        populate: { path: 'femme', select: 'firstName lastName avatar' },
      })
      .sort({ createdAt: -1 });

    console.log('[DEBUG getDonatorPropositions]', {
      donsCount: dons.length,
      femmeIdsForward,
      femmeIdsBackref,
      allFemmeIds,
      allDemandeIds: allDemandeIds.map(String),
      propositionsFound: propositions.length,
    });

    // Also check for orphaned propositions (demande: null) for diagnosis
    const orphaned = await propositionAideModel.countDocuments({ demande: null });
    console.log('[DEBUG] orphaned propositions (demande=null):', orphaned);

    res.status(200).json({ status: true, propositions });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

module.exports = {
  createDon,
  listDons,
  getDon,
  updateDon,
  confirmDon,
  changeDonStatus,
  deleteDon,
  getDonatorStats,
  getDonatorPropositions,
};