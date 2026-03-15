const donModel = require('../models/don.model');
const demandeModel = require('../models/demande.model');
const { createDonSchema, updateDonSchema } = require('../schemas/don.schema');
const { saveLog } = require('../utils/logger');

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
    const dons = await donModel.find()
      .populate('donateur', 'firstName lastName email role')
      .populate('demande');

    res.status(200).json({ status: true, dons });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getDon(req, res) {
  try {
    const don = await donModel.findById(req.params.id)
      .populate('donateur', 'firstName lastName email role')
      .populate('demande');

    if (!don) {
      return res.status(404).json({ status: false, message: 'Don introuvable' });
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

    res.status(200).json({
      status: true,
      message: 'Don confirmé avec succès',
      don
    });
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

module.exports = {
  createDon,
  listDons,
  getDon,
  updateDon,
  confirmDon,
  deleteDon
};