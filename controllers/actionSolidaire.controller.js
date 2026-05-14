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

    if (req.user.role === 'BENEVOLE') {
      // Fetch this bénévole's personal affectation decisions
      const myAffectations = await affectationModel.find({ benevole: req.user._id, action: { $ne: null } }).select('action statut');
      const refusedActionIds = myAffectations
        .filter((a) => a.statut === 'REFUSEE' && a.action)
        .map((a) => a.action.toString());

      // Only hide actions this bénévole personally refused or another bénévole already reserved
      const excludeIds = [...refusedActionIds];

      if (excludeIds.length > 0) {
        filter._id = { $nin: excludeIds };
      }
      // Never show globally-refused actions
      filter.statut = { $ne: 'REFUSEE' };
      // Never show actions already taken by someone else
      filter.$or = [
        { benevoleResponsable: null },
        { benevoleResponsable: req.user._id },
      ];
    }

    const actions = await actionSolidaireModel.find(filter)
      .populate('association', 'firstName lastName email nomOrganisation adresse role')
      .populate('benevoles', 'firstName lastName email role competences adresse telephone')
      .populate('benevoleResponsable', 'firstName lastName email telephone adresse competences')
      .populate('demande', 'titre type');

    // For BENEVOLE: annotate each action with _myRefused / _myPending / _myAccepted
    if (req.user.role === 'BENEVOLE') {
      const myAffectations = await affectationModel.find({ benevole: req.user._id, action: { $ne: null } }).select('action statut source');
      const refusedSet = new Set(
        myAffectations.filter((a) => a.statut === 'REFUSEE' && a.action).map((a) => a.action.toString())
      );
      const pendingSet = new Set(
        myAffectations.filter((a) => a.statut === 'EN_ATTENTE' && a.action).map((a) => a.action.toString())
      );
      const acceptedSet = new Set(
        myAffectations.filter((a) => a.statut === 'ACCEPTEE' && a.action).map((a) => a.action.toString())
      );
      // Invitations are EN_ATTENTE affectations created BY the association (source = INVITATION)
      const invitedSet = new Set(
        myAffectations.filter((a) => a.statut === 'EN_ATTENTE' && a.source === 'INVITATION' && a.action).map((a) => a.action.toString())
      );
      // Map affectation _id by action for use in Accept/Refuse calls
      const invitedAffMap = {};
      myAffectations.filter((a) => a.statut === 'EN_ATTENTE' && a.source === 'INVITATION' && a.action).forEach((a) => {
        invitedAffMap[a.action.toString()] = a._id.toString();
      });

      // Build a set of dates where the bénévole already has a confirmed (ACCEPTEE) action
      const acceptedActionIds = myAffectations
        .filter((a) => a.statut === 'ACCEPTEE' && a.action)
        .map((a) => a.action.toString());
      const acceptedActions = acceptedActionIds.length > 0
        ? await actionSolidaireModel.find({ _id: { $in: acceptedActionIds } }).select('dateAction')
        : [];
      // Store as "YYYY-MM-DD" strings for O(1) date lookup
      const busyDates = new Set(
        acceptedActions
          .filter((a) => a.dateAction)
          .map((a) => new Date(a.dateAction).toISOString().slice(0, 10))
      );

      const annotated = actions.map((a) => {
        const obj = a.toObject();
        obj._myRefused  = refusedSet.has(a._id.toString());
        obj._myPending  = pendingSet.has(a._id.toString());
        obj._myAccepted = acceptedSet.has(a._id.toString());
        obj._myInvited  = invitedSet.has(a._id.toString());
        obj._invitationAffId = invitedAffMap[a._id.toString()] || null;
        obj._isFull     = !!(a.maxBenevoles && (a.benevoles?.length || 0) >= a.maxBenevoles);
        // Flag taken by someone else (should never reach here since query already excludes them, extra safety)
        const respId = a.benevoleResponsable?._id?.toString() || a.benevoleResponsable?.toString();
        obj._isTakenByOther = !!(respId && respId !== req.user._id.toString());
        // Availability: does the bénévole already have a confirmed action on this date?
        const actionDate = a.dateAction ? new Date(a.dateAction).toISOString().slice(0, 10) : null;
        obj._hasDateConflict = !!(actionDate && busyDates.has(actionDate) && !obj._myAccepted);
        return obj;
      });
      return res.status(200).json({ status: true, actions: annotated });
    }

    res.status(200).json({ status: true, actions });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getActionSolidaire(req, res) {
  try {
    const action = await actionSolidaireModel.findById(req.params.id)
      .populate('association', 'firstName lastName email nomOrganisation adresse role telephone')
      .populate('benevoles', 'firstName lastName email role competences adresse telephone')
      .populate('benevoleResponsable', 'firstName lastName email telephone adresse region competences')
      .populate('demande', 'titre type description statut');

    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    if (req.user.role === 'ASSOCIATION') {
      const assocId = action.association?._id?.toString() || action.association?.toString();
      if (assocId !== req.user._id.toString()) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette action' });
      }
    }

    if (req.user.role === 'BENEVOLE') {
      const myAffectation = await affectationModel.findOne({
        action: action._id,
        benevole: req.user._id,
      });
      const benevoleIds = (action.benevoles || []).map((b) => b?._id?.toString() || b?.toString());
      const isConfirmed = benevoleIds.includes(req.user._id.toString());
      const globallyRefused = action.statut === 'REFUSEE';
      const personallyRefused = myAffectation?.statut === 'REFUSEE';
      if (globallyRefused || (personallyRefused && !isConfirmed)) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette action' });
      }
      // Check if this action is taken by someone else
      const respId = action.benevoleResponsable?._id?.toString() || action.benevoleResponsable?.toString();
      const isTakenByOther = !!(respId && respId !== req.user._id.toString());
      const acceptedAffectation = await affectationModel
        .findOne({ action: action._id, statut: 'ACCEPTEE' })
        .populate('benevole', 'firstName lastName email telephone competences adresse');
      return res.status(200).json({ status: true, action, acceptedAffectation, myAffectation, isTakenByOther });
    }
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

    // Check if this action is already reserved by another bénévole
    const respId = action.benevoleResponsable?.toString();
    if (respId && respId !== req.user._id.toString()) {
      return res.status(409).json({
        status: false,
        message: 'Cette action est déjà prise par un autre bénévole'
      });
    }

    // Block candidature if max accepted bénévoles already reached
    if (action.maxBenevoles && (action.benevoles?.length || 0) >= action.maxBenevoles) {
      return res.status(409).json({
        status: false,
        message: `Cette action est complète — ${action.benevoles.length}/${action.maxBenevoles} bénévoles déjà acceptés`
      });
    }

    // Check if bénévole already has a pending or accepted affectation for this action
    const existing = await affectationModel.findOne({
      benevole: req.user._id,
      action: action._id,
    });

    if (existing && ['EN_ATTENTE', 'ACCEPTEE'].includes(existing.statut)) {
      return res.status(409).json({
        status: false,
        message: existing.statut === 'EN_ATTENTE'
          ? 'Votre candidature est déjà en attente de validation'
          : 'Vous participez déjà à cette action'
      });
    }

    // Upsert affectation with EN_ATTENTE — admin must validate before bénévole is added to benevoles[]
    if (existing && existing.statut === 'REFUSEE') {
      // Re-application after previous refusal — reset to EN_ATTENTE
      existing.statut = 'EN_ATTENTE';
      existing.source = 'CANDIDATURE';
      await existing.save();
      var affectation = existing;
    } else {
      var affectation = await affectationModel.create({
        benevole: req.user._id,
        action: action._id,
        statut: 'EN_ATTENTE',
        source: 'CANDIDATURE',
      });
    }

    await saveLog({
      action: `${req.user.firstName} a postulé pour une action solidaire`,
      actorId: req.user._id
    });

    // Notify admins for validation
    await notifyRole(
      'ADMINISTRATEUR',
      `${req.user.firstName} ${req.user.lastName} a postulé pour rejoindre une action solidaire. En attente de validation.`,
      'affectation',
      '/admin/affectations'
    );

    // Notify the association that a volunteer applied
    if (action.association) {
      await notifyUser(
        action.association,
        `📩 ${req.user.firstName} ${req.user.lastName} a postulé pour rejoindre votre action "${action.titre}". Consultez les candidatures pour accepter ou refuser sa participation.`,
        'benevole_inscrit',
        '/association/actions-solidaires'
      );
    }

    res.status(200).json({
      status: true,
      message: 'Candidature envoyée avec succès. En attente de validation par un administrateur.',
      affectation
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function refuserAction(req, res) {
  try {
    if (req.user.role !== 'BENEVOLE') {
      return res.status(403).json({ status: false, message: 'Accès refusé' });
    }

    const action = await actionSolidaireModel.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    // Remove bénévole from action.benevoles if present (they might have joined then changed mind)
    await actionSolidaireModel.findByIdAndUpdate(
      req.params.id,
      { $pull: { benevoles: req.user._id } }
    );

    // Clear benevoleResponsable if this bénévole was the one who reserved it
    const freshAction = await actionSolidaireModel.findById(req.params.id).select('benevoleResponsable');
    if (freshAction?.benevoleResponsable?.toString() === req.user._id.toString()) {
      await actionSolidaireModel.findByIdAndUpdate(req.params.id, {
        benevoleResponsable: null,
        dateParticipation: null,
      });
    }

    // Upsert affectation with REFUSEE status — keeps history without blocking the action for others
    const existing = await affectationModel.findOne({
      benevole: req.user._id,
      action: action._id,
    });

    if (existing) {
      existing.statut = 'REFUSEE';
      await existing.save();
    } else {
      await affectationModel.create({
        benevole: req.user._id,
        action: action._id,
        statut: 'REFUSEE',
      });
    }

    await saveLog({
      action: `${req.user.firstName} a refusé une action solidaire`,
      actorId: req.user._id,
    });

    // Notify the association that this bénévole declined
    if (action.association) {
      await notifyUser(
        action.association,
        `🔕 ${req.user.firstName} ${req.user.lastName} a décliné la participation à votre action "${action.titre}". L'action reste disponible pour d'autres bénévoles.`,
        'benevole_refuse',
        '/association/actions-solidaires'
      );
    }

    res.status(200).json({ status: true, message: 'Action refusée et enregistrée dans votre historique' });
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

async function quitterAction(req, res) {
  try {
    if (req.user.role !== 'BENEVOLE') {
      return res.status(403).json({ status: false, message: 'Accès refusé' });
    }

    const action = await actionSolidaireModel.findByIdAndUpdate(
      req.params.id,
      { $pull: { benevoles: req.user._id } },
      { new: true }
    ).populate('association', 'firstName lastName email nomOrganisation adresse role')
     .populate('benevoles', 'firstName lastName email role competences');

    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    // Clear benevoleResponsable if this bénévole was the responsible one
    if (action.benevoleResponsable?.toString() === req.user._id.toString()) {
      await actionSolidaireModel.findByIdAndUpdate(req.params.id, {
        benevoleResponsable: null,
        dateParticipation: null,
      });
    }

    await affectationModel.findOneAndDelete({
      benevole: req.user._id,
      action: action._id,
    });

    await saveLog({
      action: `${req.user.firstName} a quitté une action solidaire`,
      actorId: req.user._id,
    });

    res.status(200).json({ status: true, message: 'Désinscription effectuée', action });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

// ─── Association: invite a bénévole directly to an action ────────────────────
async function inviterBenevole(req, res) {
  try {
    if (req.user.role !== 'ASSOCIATION') {
      return res.status(403).json({ status: false, message: 'Réservé aux associations' });
    }

    const action = await actionSolidaireModel.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ status: false, message: 'Action introuvable' });
    }

    // Only the owning association can invite
    if (action.association.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: false, message: 'Non autorisé' });
    }

    const benevoleId = req.params.benevoleId;

    // Check not already in the action
    const alreadyIn = (action.benevoles || []).some((b) => b.toString() === benevoleId);
    if (alreadyIn) {
      return res.status(409).json({ status: false, message: 'Ce bénévole participe déjà à cette action' });
    }

    // Block invite if the action is already full
    if (action.maxBenevoles && (action.benevoles?.length || 0) >= action.maxBenevoles) {
      return res.status(409).json({
        status: false,
        message: `Cette action est complète — ${action.benevoles.length}/${action.maxBenevoles} bénévoles déjà acceptés`
      });
    }

    // Create/update affectation as EN_ATTENTE (invitation — bénévole must accept or refuse)
    const existing = await affectationModel.findOne({ benevole: benevoleId, action: action._id });
    if (existing) {
      if (existing.statut !== 'EN_ATTENTE') {
        return res.status(409).json({
          status: false,
          message: `Ce bénévole a déjà une affectation "${existing.statut}" pour cette action`
        });
      }
      // Already pending — idempotent
    } else {
      await affectationModel.create({
        benevole: benevoleId,
        action: action._id,
        statut: 'EN_ATTENTE',
        source: 'INVITATION',
      });
    }

    await saveLog({
      action: `${req.user.firstName} a envoyé une invitation à un bénévole pour l'action "${action.titre}"`,
      actorId: req.user._id,
    });

    // Notify the invited bénévole — they must accept or refuse from their space
    await notifyUser(
      benevoleId,
      `💌 Vous avez été invité(e) par ${req.user.nomOrganisation || req.user.firstName} à participer à l'action solidaire "${action.titre}". Consultez vos affectations pour accepter ou refuser.`,
      'affectation_invitation',
      '/benevole/affectations'
    );

    res.status(200).json({ status: true, message: 'Invitation envoyée avec succès' });
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
  quitterAction,
  refuserAction,
  changeActionStatus,
  inviterBenevole,
};