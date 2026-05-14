const propositionAideModel = require('../models/propositionAide.model');
const demandeModel = require('../models/demande.model');
const userModel = require('../models/user.model');
const sendEmail = require('../utils/mailer');
const { createPropositionAideSchema, updatePropositionAideSchema } = require('../schemas/propositionAide.schema');
const { saveLog } = require('../utils/logger');
const { notifyUser, notifyRole } = require('../utils/notify');

async function createPropositionAide(req, res) {
  try {
    const validation = createPropositionAideSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const payload = {
      description: req.body.description,
      association: req.user._id,
      ...(req.body.titre ? { titre: req.body.titre } : {}),
      ...(req.body.typeAide ? { typeAide: req.body.typeAide } : {}),
    };

    if (req.body.demande) {
      payload.demande = req.body.demande;
      // Auto-populate femme from demande
      const demande = await demandeModel.findById(req.body.demande).select('femme');
      if (demande?.femme) {
        payload.femme = demande.femme;
      }
    } else if (req.body.femme) {
      payload.femme = req.body.femme;
    }

    const proposition = await propositionAideModel.create(payload);

    await saveLog({
      action: `${req.user.firstName} a proposé une aide`,
      actorId: req.user._id
    });

    // Pour les propositions générales (sans demande ni femme ciblée), notifier toutes les FEMME MALADE
    if (!req.body.demande && !req.body.femme) {
      await notifyRole(
        'FEMME MALADE',
        `Nouvelle proposition d'aide disponible${req.body.titre ? ` : ${req.body.titre}` : ''}.`,
        'proposition_aide',
        '/mes-propositions'
      );
    }

    // Notify the femme malade who owns the demande
    if (req.body.demande) {
      const demande = await demandeModel.findById(req.body.demande).select('femme');
      if (demande?.femme) {
        await notifyUser(
          demande.femme,
          `Une association a proposé une aide pour votre demande.`,
          'proposition_aide',
          '/mes-propositions'
        );
      }
    }
    // Notify admins
    await notifyRole(
      'ADMINISTRATEUR',
      `${req.user.firstName} (association) a soumis une proposition d'aide.`,
      'activite_importante',
      '/propositions'
    );

    // Confirm to the association itself
    await notifyUser(
      req.user._id,
      `Votre proposition d'aide a été soumise avec succès et est en attente de validation.`,
      'proposition_aide',
      '/association/propositions-aide'
    );

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

    if (req.user.role === 'FEMME MALADE') {
      // Récupérer les IDs de toutes les demandes de cette femme
      const mesDemandes = await demandeModel.find({ femme: req.user._id }).select('_id');
      const mesDemandeIds = mesDemandes.map((d) => d._id);

      if (req.query.demande) {
        // Seules ses propres demandes sont accessibles
        const appartient = mesDemandeIds.some((id) => id.toString() === req.query.demande);
        if (!appartient) {
          return res.status(200).json({ status: true, propositions: [] });
        }
        filter.demande = req.query.demande;
      } else {
        // Propositions liées à ses demandes + propositions générales disponibles ou acceptées par elle
        const orClauses = [];
        if (mesDemandeIds.length > 0) {
          orClauses.push({ demande: { $in: mesDemandeIds } });
        }
        // Propositions générales disponibles (pas encore acceptées, pas refusées par elle)
        orClauses.push({
          demande: null,
          femme: null,
          statut: 'PROPOSEE',
          accepted_by_femme: null,
          refused_by: { $nin: [req.user._id] }
        });
        // Propositions générales qu'elle a acceptées
        orClauses.push({ demande: null, femme: null, accepted_by_femme: req.user._id });
        filter.$or = orClauses;
      }
    } else if (req.query.demande) {
      filter.demande = req.query.demande;
    }

    const propositions = await propositionAideModel.find(filter)
      .populate('association', 'firstName lastName email nomOrganisation adresse telephone role avatar')
      .populate('femme', 'firstName lastName email role avatar telephone')
      .populate('accepted_by_femme', 'firstName lastName email role avatar telephone')
      .populate({
        path: 'demande',
        populate: {
          path: 'femme',
          select: 'firstName lastName email role avatar telephone'
        }
      });

    res.status(200).json({ status: true, propositions });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function getPropositionAide(req, res) {
  try {
    const proposition = await propositionAideModel.findById(req.params.id)
      .populate('association', 'firstName lastName email nomOrganisation adresse telephone role avatar')
      .populate('femme', 'firstName lastName email role avatar telephone')
      .populate('accepted_by_femme', 'firstName lastName email role avatar telephone')
      .populate({
        path: 'demande',
        populate: {
          path: 'femme',
          select: 'firstName lastName email role avatar telephone'
        }
      });

    if (!proposition) {
      return res.status(404).json({ status: false, message: 'Proposition introuvable' });
    }

    if (req.user.role === 'FEMME MALADE') {
      const mesDemandes = await demandeModel.find({ femme: req.user._id }).select('_id');
      const mesDemandeIds = mesDemandes.map((d) => d._id.toString());

      const propFemmeId = proposition.femme?._id?.toString() || proposition.femme?.toString();
      const propDemandeId = proposition.demande?._id?.toString() || proposition.demande?.toString();
      const isTiedToHer = propFemmeId === req.user._id.toString();
      const isHerDemande = propDemandeId && mesDemandeIds.includes(propDemandeId);
      const isGeneral = !propFemmeId && !propDemandeId;
      const isAvailable = isGeneral && proposition.statut === 'PROPOSEE' && !proposition.accepted_by_femme;
      const isHerAccepted = isGeneral && (proposition.accepted_by_femme?._id?.toString() || proposition.accepted_by_femme?.toString()) === req.user._id.toString();

      if (!isTiedToHer && !isHerDemande && !isAvailable && !isHerAccepted) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette proposition' });
      }
    }

    if (req.user.role === 'ASSOCIATION') {
      const assocId = proposition.association?._id?.toString() || proposition.association?.toString();
      if (assocId !== req.user._id.toString()) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette proposition' });
      }
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

async function changePropositionStatus(req, res) {
  try {
    const { statut } = req.body;
    const allowed = ['PROPOSEE', 'ACCEPTEE', 'REFUSEE'];
    if (!allowed.includes(statut)) {
      return res.status(400).json({ status: false, message: 'Statut invalide' });
    }

    const proposition = await propositionAideModel.findById(req.params.id).populate({
      path: 'demande',
      select: 'femme titre'
    });

    if (!proposition) {
      return res.status(404).json({ status: false, message: 'Proposition introuvable' });
    }

    if (req.user.role === 'FEMME MALADE') {
      const mesDemandes = await demandeModel.find({ femme: req.user._id }).select('_id');
      const mesDemandeIds = mesDemandes.map((d) => d._id.toString());

      const propFemmeId = proposition.femme?.toString();
      const propDemandeId = proposition.demande?._id?.toString() || proposition.demande?.toString();
      const isTiedToHer = propFemmeId === req.user._id.toString();
      const isHerDemande = propDemandeId && mesDemandeIds.includes(propDemandeId);
      const isGeneral = !propFemmeId && !propDemandeId;
      const isAvailable = isGeneral && proposition.statut === 'PROPOSEE' && !proposition.accepted_by_femme;
      const isHerAccepted = isGeneral && proposition.accepted_by_femme?.toString() === req.user._id.toString();

      if (!isTiedToHer && !isHerDemande && !isAvailable && !isHerAccepted) {
        return res.status(403).json({ status: false, message: 'Accès non autorisé à cette proposition' });
      }

      if (!['ACCEPTEE', 'REFUSEE'].includes(statut)) {
        return res.status(400).json({ status: false, message: 'La femme peut seulement accepter ou refuser la proposition' });
      }

      // Pour les propositions générales, un refus est tracé par femme sans changer le statut global
      if (statut === 'REFUSEE' && isGeneral) {
        await propositionAideModel.findByIdAndUpdate(req.params.id, {
          $addToSet: { refused_by: req.user._id }
        });
        await saveLog({ action: `${req.user.firstName} a refusé une proposition générale`, actorId: req.user._id });
        return res.status(200).json({ status: true, message: 'Proposition refusée', proposition });
      }
    }

    proposition.statut = statut;
    // Enregistrer quelle femme a accepté la proposition
    if (statut === 'ACCEPTEE') {
      proposition.accepted_by_femme = req.user._id;
    } else if (statut === 'REFUSEE') {
      proposition.accepted_by_femme = undefined;
    }
    await proposition.save();

    await saveLog({
      action: `${req.user.firstName} a changé le statut d'une proposition à ${statut}`,
      actorId: req.user._id
    });

    // Notify association of femme's decision
    if (['ACCEPTEE', 'REFUSEE'].includes(statut) && proposition.association) {
      const isAccepted = statut === 'ACCEPTEE';
      await notifyUser(
        proposition.association,
        isAccepted
          ? `Votre proposition d'aide a été acceptée par ${req.user.firstName} ${req.user.lastName || ''}.`.trim()
          : 'Votre proposition d\'aide a été refusée par la bénéficiaire.',
        isAccepted ? 'proposition_acceptee' : 'proposition_rejetee',
        '/association/propositions-aide'
      );

      // Envoyer un e-mail à l'association avec les coordonnées de la femme acceptante
      if (isAccepted) {
        const assoc = await userModel.findById(proposition.association).select('email firstName nomOrganisation');
        if (assoc?.email) {
          await sendEmail({
            email: assoc.email,
            subject: "Proposition d'aide acceptée – Coordonnées de la bénéficiaire",
            content: `Bonjour ${assoc.nomOrganisation || assoc.firstName},\n\nVotre proposition d'aide a été acceptée.\n\nVoici les coordonnées de la bénéficiaire :\n\nNom complet : ${req.user.firstName} ${req.user.lastName || ''}\nTéléphone : ${req.user.telephone || 'Non renseigné'}\nEmail : ${req.user.email}\nRégion : ${req.user.region || 'Non renseignée'}\n\nVous pouvez la contacter directement pour organiser l'aide.\n\nCordialement,\nLa plateforme`
          });
        }
      }
    }
    // If accepted, also confirm accompaniment to the femme malade
    if (statut === 'ACCEPTEE' && proposition.demande?.femme) {
      await notifyUser(
        proposition.demande.femme,
        'Un accompagnement a été confirmé suite à votre demande d\'aide.',
        'affectation_confirmee',
        '/mes-demandes'
      );
    }

    res.status(200).json({ status: true, message: 'Statut mis à jour', proposition });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

module.exports = {
  createPropositionAide,
  listPropositionsAide,
  getPropositionAide,
  updatePropositionAide,
  deletePropositionAide,
  changePropositionStatus
};