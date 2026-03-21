const propositionAideModel = require('../models/propositionAide.model');
const { createPropositionAideSchema, updatePropositionAideSchema } = require('../schemas/propositionAide.schema');
const { saveLog } = require('../utils/logger');

async function createPropositionAide(req, res) {
  try {
    const validation = createPropositionAideSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const proposition = await propositionAideModel.create({
      ...req.body,
      association: req.user._id
    });

    await saveLog({
      action: `${req.user.firstName} a proposé une aide`,
      actorId: req.user._id
    });

    res.status(201).json({
      status: true,
      message: 'Proposition créée avec succès',
      proposition
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function listPropositionsAide(req, res) {
  try {
    const filter = {};

    if (req.user.role === 'ASSOCIATION') {
      filter.association = req.user._id;
    }

    if (req.query.demande) {
      filter.demande = req.query.demande;
    }

    const propositions = await propositionAideModel.find(filter)
      .populate('association', 'firstName lastName email nomOrganisation adresse role')
      .populate('demande');

    res.status(200).json({ status: true, propositions });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getPropositionAide(req, res) {
  try {
    const proposition = await propositionAideModel.findById(req.params.id)
      .populate('association', 'firstName lastName email nomOrganisation adresse role')
      .populate('demande');

    if (!proposition) {
      return res.status(404).json({ status: false, message: 'Proposition introuvable' });
    }

    res.status(200).json({ status: true, proposition });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function updatePropositionAide(req, res) {
  try {
    const validation = updatePropositionAideSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const proposition = await propositionAideModel.findById(req.params.id);

    if (!proposition) {
      return res.status(404).json({ status: false, message: 'Proposition introuvable' });
    }

    const updated = await propositionAideModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await saveLog({
      action: `${req.user.firstName} a modifié une proposition d'aide`,
      actorId: req.user._id
    });

    res.status(200).json({
      status: true,
      message: 'Proposition mise à jour avec succès',
      proposition: updated
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function deletePropositionAide(req, res) {
  try {
    const proposition = await propositionAideModel.findById(req.params.id);

    if (!proposition) {
      return res.status(404).json({ status: false, message: 'Proposition introuvable' });
    }

    await propositionAideModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: 'Proposition supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

module.exports = {
  createPropositionAide,
  listPropositionsAide,
  getPropositionAide,
  updatePropositionAide,
  deletePropositionAide
};