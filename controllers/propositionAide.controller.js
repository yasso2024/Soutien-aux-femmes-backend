const propositionAideModel = require('../models/propositionAide.model');
const demandeModel = require('../models/demande.model');
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
      association: req.user._id
    };

    if (req.body.demande) {
      payload.demande = req.body.demande;
    }

    const proposition = await propositionAideModel.create(payload);

    await saveLog({
      action: `${req.user.firstName} a proposé une aide`,
      actorId: req.user._id
    });

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
      // Les femmes voient :
      // 1. Les propositions liées à leurs demandes
      // 2. Les propositions générales (sans demande spécifique)
      const demandes = await demandeModel.find({ femme: req.user._id }).select('_id');
      const demandeIds = demandes.map((demande) => demande._id);
      
      filter.$or = [
        { demande: { $in: demandeIds } }, // Propositions liées à leurs demandes
        { demande: { $exists: false } }   // Propositions générales
      ];
    }

    if (req.query.demande) {
      if (req.user.role === 'FEMME MALADE') {
        // Vérifier que la demande appartient bien à la femme
        const demandes = await demandeModel.find({ femme: req.user._id, _id: req.query.demande }).select('_id');
        if (demandes.length > 0) {
          filter.demande = req.query.demande;
        } else {
          // Si la demande n'appartient pas à la femme, ne rien retourner
          return res.status(200).json({ status: true, propositions: [] });
        }
      } else {
        filter.demande = req.query.demande;
      }
    }

    const propositions = await propositionAideModel.find(filter)
      .populate('association', 'firstName lastName email nomOrganisation adresse role avatar')
      .populate({
        path: 'demande',
        populate: {
          path: 'femme',
          select: 'firstName lastName email role avatar'
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
      .populate('association', 'firstName lastName email nomOrganisation adresse role avatar')
      .populate({
        path: 'demande',
        populate: {
          path: 'femme',
          select: 'firstName lastName email role avatar'
        }
      });

    if (!proposition) {
      return res.status(404).json({ status: false, message: 'Proposition introuvable' });
    }

    if (req.user.role === 'FEMME MALADE') {
      // Les femmes peuvent voir :
      // 1. Les propositions liées à leurs demandes
      // 2. Les propositions générales (sans demande spécifique)
      const hasDemande = proposition.demande;
      if (hasDemande) {
        const femmeId = proposition?.demande?.femme?._id?.toString();
        if (femmeId !== req.user._id.toString()) {
          return res.status(403).json({ status: false, message: 'Accès non autorisé à cette proposition' });
        }
      }
      // Pour les propositions générales, pas de vérification supplémentaire
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
      // Pour les propositions liées à une demande, vérifier que la demande appartient à la femme
      if (proposition.demande) {
        const femmeId = proposition?.demande?.femme?.toString();
        if (femmeId !== req.user._id.toString()) {
          return res.status(403).json({ status: false, message: 'Accès non autorisé à cette proposition' });
        }
      }
      // Pour les propositions générales, pas de vérification supplémentaire

      if (!['ACCEPTEE', 'REFUSEE'].includes(statut)) {
        return res.status(400).json({ status: false, message: 'La femme peut seulement accepter ou refuser la proposition' });
      }
    }

    proposition.statut = statut;
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
          ? 'Votre proposition d\'aide a été acceptée par la bénéficiaire.'
          : 'Votre proposition d\'aide a été refusée par la bénéficiaire.',
        isAccepted ? 'proposition_acceptee' : 'proposition_rejetee',
        '/mes-propositions'
      );
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