const actionSolidaireModel = require('../models/actionSolidaire.model');
const affectationModel = require('../models/affectation.model');
const { createActionSolidaireSchema, updateActionSolidaireSchema } = require('../schemas/actionSolidaire.schema');
const { saveLog } = require('../utils/logger');
const { notifyUser, notifyRole } = require('../utils/notify');

async function createActionSolidaire(req, res) {
  try {
    const validation = createActionSolidaireSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const action = await actionSolidaireModel.create({
      ...req.body,
      association: req.user._id
    });

    await saveLog({
      action: `${req.user.firstName} a créé une action solidaire`,
      actorId: req.user._id
    });

    // Notify all bénévoles of the new action
    await notifyRole(
      'BENEVOLE',
      `Une nouvelle action solidaire est disponible : "${action.titre || 'voir détails'}". Rejoignez-nous !`,
      'nouvelle_action',
      '/actions-solidaires'
    );
    // Alert admins
    await notifyRole(
      'ADMINISTRATEUR',
      `Nouvelle action solidaire créée par ${req.user.firstName} ${req.user.lastName}.`,
      'action_a_valider',
      '/actions-solidaires'
    );

    // Confirm to the association itself
    await notifyUser(
      req.user._id,
      `Votre action solidaire "${action.titre || 'nouvelle action'}" a été créée avec succès.`,
      'nouvelle_action',
      '/association/actions-solidaires'
    );

    res.status(201).json({
      status: true,
      message: 'Action créée avec succès',
      action
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function listActionsSolidaires(req, res) {
  try {
    const filter = {};

    if (req.user.role === 'ASSOCIATION') {
      filter.association = req.user._id;
    }

    const actions = await actionSolidaireModel.find(filter)
      .populate('association', 'firstName lastName email nomOrganisation adresse role')
      .populate('benevoles', 'firstName lastName email role competences');

    res.status(200).json({ status: true, actions });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getActionSolidaire(req, res) {
  try {
    const action = await actionSolidaireModel.findById(req.params.id)
      .populate('association', 'firstName lastName email nomOrganisation adresse role')
      .populate('benevoles', 'firstName lastName email role competences');

    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    res.status(200).json({ status: true, action });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function updateActionSolidaire(req, res) {
  try {
    const validation = updateActionSolidaireSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const action = await actionSolidaireModel.findById(req.params.id);

    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    const updated = await actionSolidaireModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await saveLog({
      action: `${req.user.firstName} a modifié une action solidaire`,
      actorId: req.user._id
    });

    res.status(200).json({
      status: true,
      message: 'Action mise à jour avec succès',
      action: updated
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function deleteActionSolidaire(req, res) {
  try {
    const action = await actionSolidaireModel.findById(req.params.id);

    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    await actionSolidaireModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: 'Action supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function participerAction(req, res) {
  try {
    if (req.user.role !== 'BENEVOLE') {
      return res.status(403).json({
        status: false,
        message: 'Seuls les bénévoles peuvent participer à une action solidaire'
      });
    }

    const action = await actionSolidaireModel.findById(req.params.id);

    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    const alreadyExists = action.benevoles.some(
      benevoleId => benevoleId.toString() === req.user._id.toString()
    );

    if (!alreadyExists) {
      action.benevoles.push(req.user._id);
      await action.save();
    }

    let affectation = await affectationModel.findOne({
      benevole: req.user._id,
      action: action._id
    });

    if (!affectation) {
      affectation = await affectationModel.create({
        benevole: req.user._id,
        action: action._id,
        statut: 'EN_ATTENTE'
      });
    }

    await saveLog({
      action: `${req.user.firstName} a rejoint une action solidaire`,
      actorId: req.user._id
    });

    // Notify the association that a volunteer joined their action
    if (action.association) {
      await notifyUser(
        action.association,
        `${req.user.firstName} ${req.user.lastName} s'est inscrit(e) à votre action solidaire.`,
        'benevole_inscrit',
        '/mes-actions'
      );
    }

    res.status(200).json({
      status: true,
      message: 'Participation enregistrée avec succès',
      action,
      affectation
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function changeActionStatus(req, res) {
  try {
    if (req.user.role !== 'ADMINISTRATEUR') {
      return res.status(403).json({ status: false, message: 'Accès refusé' });
    }

    const { statut } = req.body;
    const allowed = ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'TERMINEE'];
    if (!allowed.includes(statut)) {
      return res.status(400).json({ status: false, message: 'Statut invalide' });
    }

    const action = await actionSolidaireModel.findById(req.params.id)
      .populate('association', '_id firstName lastName oneSignalPlayerId');

    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    action.statut = statut;
    await action.save();

    await saveLog({
      action: `${req.user.firstName} a changé le statut de l'action "${action.titre}" à ${statut}`,
      actorId: req.user._id
    });

    // Notify the association
    if (action.association?._id) {
      if (statut === 'VALIDEE') {
        await notifyUser(
          action.association._id,
          `Votre action solidaire "${action.titre}" a été validée par l'administrateur.`,
          'proposition_acceptee',
          '/association/actions-solidaires'
        );
      } else if (statut === 'REFUSEE') {
        await notifyUser(
          action.association._id,
          `Votre action solidaire "${action.titre}" a été refusée par l'administrateur.`,
          'proposition_rejetee',
          '/association/actions-solidaires'
        );
      }
    }

    res.status(200).json({ status: true, message: 'Statut mis à jour', action });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

module.exports = {
  createActionSolidaire,
  listActionsSolidaires,
  getActionSolidaire,
  updateActionSolidaire,
  deleteActionSolidaire,
  participerAction,
  changeActionStatus,
};