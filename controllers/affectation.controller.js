const affectationModel = require('../models/affectation.model');
const { createAffectationSchema, updateAffectationSchema } = require('../schemas/affectation.schema');
const { saveLog } = require('../utils/logger');
const { notifyUser } = require('../utils/notify');

async function createAffectation(req, res) {
  try {
    const validation = createAffectationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const affectation = await affectationModel.create(req.body);

    await saveLog({
      action: `${req.user.firstName} a créé une affectation`,
      actorId: req.user._id
    });

    // Notify the bénévole they have been assigned
    if (req.body.benevole) {
      await notifyUser(
        req.body.benevole,
        'Vous avez été affecté(e) à une action solidaire.'
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

    const affectations = await affectationModel.find(filter)
      .populate('benevole', 'firstName lastName email role competences')
      .populate('action')
      .populate('demande');

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
      .populate('demande');

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
    const allowed = ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'TERMINEE'];

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