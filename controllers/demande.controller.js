const demandeModel = require('../models/demande.model');
const { createDemandeSchema, updateDemandeSchema } = require('../schemas/demande.schema');
const { saveLog } = require('../utils/logger');

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
    const demandes = await demandeModel
      .find()
      .populate('femme', 'firstName lastName email role')
      .populate('validePar', 'firstName lastName email role')
   

    res.status(200).json({ status: true, demandes });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getDemande(req, res) {
  try {
    const demande = await demandeModel
      .findById(req.params.id)
      .populate('femme', 'firstName lastName email role')
      .populate('validePar', 'firstName lastName email role')
    

    if (!demande) {
      return res.status(404).json({ status: false, message: 'Demande introuvable' });
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

    await saveLog({
      action: `${req.user.firstName} a changé le statut d'une demande à ${statut}`,
      actorId: req.user._id
    });

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