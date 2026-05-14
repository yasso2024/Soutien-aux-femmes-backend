const affectationModel = require('../models/affectation.model');
const demandeModel = require('../models/demande.model');
const actionSolidaireModel = require('../models/actionSolidaire.model');
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

    // If the creator is not the bénévole themselves, this is an invitation sent by the association/admin
    const isInvitation = req.user._id.toString() !== payload.benevole?.toString();
    if (isInvitation) payload.source = 'INVITATION';

    const affectation = await affectationModel.create(payload);

    await saveLog({
      action: `${req.user.firstName} a créé une affectation`,
      actorId: req.user._id
    });

    // Notify the bénévole of the invitation — they must accept or refuse
    if (req.body.benevole) {
      await notifyUser(
        req.body.benevole,
        'Vous avez reçu une invitation à participer à une action solidaire. Consultez vos affectations pour accepter ou refuser.',
        'affectation_invitation',
        '/benevole/affectations'
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

    if (req.user.role === 'ASSOCIATION') {
      // Return only affectations linked to actions owned by this association
      const myActions = await actionSolidaireModel.find({ association: req.user._id }).select('_id');
      const myActionIds = myActions.map((a) => a._id);
      filter.action = { $in: myActionIds };
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
      .populate('benevole', 'firstName lastName email telephone role competences')
      .populate({
        path: 'action',
        populate: [
          { path: 'association', select: 'firstName lastName email telephone nomOrganisation region adresse' },
          { path: 'benevoles', select: 'firstName lastName' }
        ]
      })
      .populate({ path: 'demande', populate: { path: 'femme', select: '_id firstName lastName email' } })
      .populate('femme', '_id firstName lastName email');

    res.status(200).json({ status: true, affectations });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getAffectation(req, res) {
  try {
    const affectation = await affectationModel.findById(req.params.id)
      .populate('benevole', 'firstName lastName email role competences')
      .populate({
        path: 'action',
        populate: [
          { path: 'association', select: 'firstName lastName email telephone nomOrganisation region adresse' },
          { path: 'benevoles', select: 'firstName lastName' }
        ]
      })
      .populate({ path: 'demande', populate: { path: 'femme', select: '_id firstName lastName email' } })
      .populate('femme', '_id firstName lastName email');

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    if (req.user.role === 'BENEVOLE') {
      const benevoleId = affectation.benevole?._id?.toString() || affectation.benevole?.toString();
      if (benevoleId !== req.user._id.toString()) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette affectation' });
      }
    }

    if (req.user.role === 'FEMME MALADE') {
      const femmeId = affectation.femme?.toString();
      const demandeFemmeId = affectation.demande?.femme?._id?.toString();
      if (femmeId !== req.user._id.toString() && demandeFemmeId !== req.user._id.toString()) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette affectation' });
      }
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

    // Association cannot force ACCEPTEE — only the bénévole can accept via /confirmer
    if (req.user.role === 'ASSOCIATION' && req.body.statut === 'ACCEPTEE') {
      return res.status(403).json({
        status: false,
        message: "Une association ne peut pas accepter une affectation à la place du bénévole."
      });
    }

    const affectation = await affectationModel.findById(req.params.id);

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    // State machine: REFUSEE and TERMINEE are final — no further transitions allowed
    if (['REFUSEE', 'TERMINEE'].includes(affectation.statut)) {
      return res.status(400).json({
        status: false,
        message: `Une affectation "${affectation.statut}" ne peut plus être modifiée`
      });
    }

    // EN_ATTENTE can only move to ACCEPTEE or REFUSEE
    if (affectation.statut === 'EN_ATTENTE' && req.body.statut === 'TERMINEE') {
      return res.status(400).json({
        status: false,
        message: 'Une affectation en attente ne peut pas passer directement à TERMINEE'
      });
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
    // Only the bénévole themselves can respond to an invitation
    if (req.user.role !== 'BENEVOLE') {
      return res.status(403).json({ status: false, message: 'Seuls les bénévoles peuvent répondre à une invitation' });
    }

    const affectation = await affectationModel.findById(req.params.id)
      .populate({ path: 'action', select: 'association titre benevoles maxBenevoles statut' });

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    // Must own the affectation
    if (affectation.benevole.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: false, message: 'Accès non autorisé' });
    }

    // Only EN_ATTENTE invitations can be answered
    if (affectation.statut !== 'EN_ATTENTE') {
      return res.status(400).json({
        status: false,
        message: `Cette affectation est déjà "${affectation.statut}" — elle ne peut plus être modifiée`
      });
    }

    const statut = req.body.statut;
    if (!['ACCEPTEE', 'REFUSEE'].includes(statut)) {
      return res.status(400).json({ status: false, message: 'Statut invalide. Valeurs acceptées : ACCEPTEE, REFUSEE' });
    }

    // If accepting, check the action is not already full
    if (statut === 'ACCEPTEE' && affectation.action) {
      const actionDoc = affectation.action;
      if (actionDoc.maxBenevoles && (actionDoc.benevoles?.length || 0) >= actionDoc.maxBenevoles) {
        return res.status(409).json({
          status: false,
          message: `Cette action est complète (${actionDoc.benevoles.length}/${actionDoc.maxBenevoles} bénévoles). Impossible d'accepter.`
        });
      }
    }

    affectation.statut = statut;
    await affectation.save();

    // Sync action.benevoles when accepted
    const actionId = affectation.action?._id || affectation.action;
    if (actionId) {
      if (statut === 'ACCEPTEE') {
        const updatedAction = await actionSolidaireModel.findByIdAndUpdate(
          actionId,
          { $addToSet: { benevoles: affectation.benevole } },
          { new: true }
        ).select('maxBenevoles benevoles statut');
        // Auto-validate action when full
        if (updatedAction?.maxBenevoles && (updatedAction.benevoles?.length || 0) >= updatedAction.maxBenevoles) {
          if (updatedAction.statut === 'EN_ATTENTE') {
            await actionSolidaireModel.findByIdAndUpdate(actionId, { statut: 'VALIDEE' });
          }
        }
      } else if (statut === 'REFUSEE') {
        await actionSolidaireModel.findByIdAndUpdate(actionId, { $pull: { benevoles: affectation.benevole } });
      }
    }

    await saveLog({
      action: `${req.user.firstName} a ${statut === 'ACCEPTEE' ? 'accepté' : 'refusé'} une invitation à une action solidaire`,
      actorId: req.user._id
    });

    // Notify the association of the bénévole's response
    const actionTitle = affectation.action?.titre || 'l\'action solidaire';
    const benevoleName = `${req.user.firstName} ${req.user.lastName}`.trim();
    const assocId = affectation.action?.association;
    if (assocId) {
      await notifyUser(
        assocId,
        statut === 'ACCEPTEE'
          ? `✅ ${benevoleName} a accepté votre invitation pour l'action "${actionTitle}".`
          : `🚫 ${benevoleName} a refusé votre invitation pour l'action "${actionTitle}".`,
        statut === 'ACCEPTEE' ? 'participation_confirmee' : 'participation_refusee',
        '/association/affectations'
      );
    }

    res.status(200).json({
      status: true,
      message: statut === 'ACCEPTEE' ? 'Participation confirmée avec succès' : 'Invitation refusée',
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

    const affectation = await affectationModel.findById(req.params.id)
      .populate({ path: 'action', select: 'association titre dateAction lieu' });

    if (!affectation) {
      return res.status(404).json({ status: false, message: 'Affectation introuvable' });
    }

    // ASSOCIATION can only manage affectations for their own actions
    if (req.user.role === 'ASSOCIATION') {
      if (!affectation.action) {
        return res.status(404).json({ status: false, message: "L'action associée à cette affectation est introuvable" });
      }
      const actionAssocId = affectation.action.association?.toString();
      if (actionAssocId !== req.user._id.toString()) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé' });
      }
      // The bénévole is the one who accepts or refuses — the association cannot force an acceptance
      if (statut === 'ACCEPTEE') {
        return res.status(403).json({
          status: false,
          message: "Une association ne peut pas accepter une affectation à la place du bénévole. Le bénévole doit répondre lui-même à l'invitation."
        });
      }
    } else if (req.user.role !== 'ADMINISTRATEUR') {
      return res.status(403).json({ status: false, message: 'Accès non autorisé' });
    }

    const previousStatut = affectation.statut;

    // State machine: REFUSEE and TERMINEE are final — no further transitions allowed
    if (['REFUSEE', 'TERMINEE'].includes(previousStatut)) {
      return res.status(400).json({
        status: false,
        message: `Une affectation "${previousStatut}" ne peut plus être modifiée`
      });
    }

    // EN_ATTENTE can only move to ACCEPTEE or REFUSEE
    if (previousStatut === 'EN_ATTENTE' && statut === 'TERMINEE') {
      return res.status(400).json({
        status: false,
        message: 'Une affectation en attente ne peut pas passer directement à TERMINEE'
      });
    }

    // Block acceptance if the action is already full
    if (statut === 'ACCEPTEE') {
      const actionDoc = await actionSolidaireModel.findById(
        affectation.action?._id || affectation.action
      ).select('maxBenevoles benevoles');
      if (actionDoc?.maxBenevoles && (actionDoc.benevoles?.length || 0) >= actionDoc.maxBenevoles) {
        return res.status(409).json({
          status: false,
          message: `Cette action est complète — ${actionDoc.benevoles.length}/${actionDoc.maxBenevoles} bénévoles déjà acceptés. Impossible d'en accepter un(e) de plus.`
        });
      }
    }

    affectation.statut = statut;
    await affectation.save();

    // Sync action.benevoles[] when admin validates or refuses a bénévole's application
    const actionId = affectation.action?._id || affectation.action;
    if (actionId) {
      if (statut === 'ACCEPTEE') {
        await actionSolidaireModel.findByIdAndUpdate(
          actionId,
          { $addToSet: { benevoles: affectation.benevole } }
        );
        // If action is now full, auto-refuse remaining EN_ATTENTE affectations and auto-validate the action
        const updatedAction = await actionSolidaireModel.findById(actionId).select('maxBenevoles benevoles statut titre dateAction lieu');
        if (updatedAction?.maxBenevoles && (updatedAction.benevoles?.length || 0) >= updatedAction.maxBenevoles) {
          // Auto-refuse pending applicants
          const pendingToRefuse = await affectationModel.find({
            action: actionId,
            _id: { $ne: affectation._id },
            statut: 'EN_ATTENTE',
          }).select('benevole');
          if (pendingToRefuse.length > 0) {
            await affectationModel.updateMany(
              { action: actionId, _id: { $ne: affectation._id }, statut: 'EN_ATTENTE' },
              { statut: 'REFUSEE' }
            );
            const actionTitle = updatedAction.titre || 'l\'action solidaire';
            for (const pending of pendingToRefuse) {
              if (pending.benevole) {
                await notifyUser(
                  pending.benevole,
                  `🚫 L'action "${actionTitle}" est désormais complète. Votre candidature a été automatiquement refusée.`,
                  'participation_refusee',
                  '/benevole/actions-solidaires'
                );
              }
            }
          }
          // Auto-transition to VALIDEE when action is complete (all spots filled & accepted)
          if (updatedAction.statut === 'EN_ATTENTE') {
            await actionSolidaireModel.findByIdAndUpdate(actionId, { statut: 'VALIDEE' });
          }
        }
      } else if (['REFUSEE', 'TERMINEE'].includes(statut) && previousStatut === 'ACCEPTEE') {
        await actionSolidaireModel.findByIdAndUpdate(
          actionId,
          { $pull: { benevoles: affectation.benevole } }
        );
      }
      // If admin refuses a bénévole who was the reserved responsible → free the action
      if (statut === 'REFUSEE') {
        const actionDoc = await actionSolidaireModel.findById(actionId).select('benevoleResponsable');
        if (actionDoc?.benevoleResponsable?.toString() === affectation.benevole?.toString()) {
          await actionSolidaireModel.findByIdAndUpdate(actionId, {
            benevoleResponsable: null,
            dateParticipation: null,
          });
        }
      }
    }

    await saveLog({
      action: `${req.user.firstName} a changé le statut d'une affectation à ${statut}`,
      actorId: req.user._id
    });

    // Notify bénévole with rich action details
    const actionTitle = affectation.action?.titre || 'l\'action solidaire';
    const actionDateRaw = affectation.action?.dateAction;
    const actionDateStr = actionDateRaw
      ? new Date(actionDateRaw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    const actionLieu = affectation.action?.lieu;

    const buildNotifMsg = (st) => {
      const base = `Action : "${actionTitle}"`;
      const datePart = actionDateStr ? ` | Date : ${actionDateStr}` : '';
      const lieuPart = actionLieu ? ` | Lieu : ${actionLieu}` : '';
      if (st === 'ACCEPTEE') {
        return `✅ Votre candidature a été acceptée ! ${base}${datePart}${lieuPart}. Vous devez vous présenter à la date et au lieu indiqués.`;
      }
      if (st === 'REFUSEE') {
        return `🚫 Votre candidature a été refusée. ${base}. Vous n'êtes pas retenu(e) pour cette action.`;
      }
      if (st === 'TERMINEE') {
        return `🏁 Votre participation est terminée. ${base}. Merci pour votre engagement !`;
      }
      return `Votre statut pour ${base} a été mis à jour : ${st}.`;
    };

    if (affectation.benevole) {
      const affectNotifLink = '/benevole/actions-solidaires';
      const notifType = { ACCEPTEE: 'participation_confirmee', REFUSEE: 'participation_refusee', TERMINEE: 'participation_terminee' }[statut] || 'affectation';
      await notifyUser(affectation.benevole, buildNotifMsg(statut), notifType, affectNotifLink);
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

/**
 * postulerAide — Un bénévole se porte volontaire pour aider avec une demande.
 * Crée une affectation EN_ATTENTE liant le bénévole à la demande.
 * Un bénévole ne peut postuler qu'une seule fois par demande.
 */
async function postulerAide(req, res) {
  try {
    if (req.user.role !== 'BENEVOLE') {
      return res.status(403).json({ status: false, message: 'Seuls les bénévoles peuvent postuler' });
    }

    const demande = await demandeModel.findById(req.params.demandeId);
    if (!demande) {
      return res.status(404).json({ status: false, message: 'Demande introuvable' });
    }

    if (demande.statut !== 'VALIDEE') {
      return res.status(400).json({ status: false, message: 'Cette demande n\'est plus disponible' });
    }

    // Prevent duplicate applications
    const existing = await affectationModel.findOne({
      benevole: req.user._id,
      demande: demande._id,
    });
    if (existing) {
      return res.status(409).json({ status: false, message: 'Vous avez déjà postulé pour cette demande' });
    }

    const affectation = await affectationModel.create({
      benevole: req.user._id,
      demande: demande._id,
      femme: demande.femme,
      statut: 'EN_ATTENTE',
      source: 'CANDIDATURE',
    });

    await saveLog({
      action: `${req.user.firstName} a postulé pour aider avec une demande`,
      actorId: req.user._id,
    });

    // Notify admins of the new application
    await notifyRole(
      'ADMINISTRATEUR',
      `${req.user.firstName} ${req.user.lastName} a postulé pour aider avec une demande d'aide.`,
      'affectation',
      '/admin/affectations'
    );

    // Notify the femme that a bénévole applied to help her
    if (demande.femme) {
      await notifyUser(
        demande.femme,
        `Un(e) bénévole souhaite vous aider pour votre demande. En attente de validation.`,
        'affectation',
        '/femme/affectations'
      );
    }

    res.status(201).json({
      status: true,
      message: 'Candidature enregistrée avec succès. En attente de validation.',
      affectation,
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
  changeAffectationStatus,
  postulerAide,
};
