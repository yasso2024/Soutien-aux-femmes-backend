const PropositionAide = require('../models/propositionAide.model');
const DemandeAide     = require('../models/demandeAide.model');
const Notification    = require('../models/notification.model');
const { propositionAideSchema } = require('../schemas/propositionAide.schema');
const { saveLog }     = require('../utils/logger');

// postulerAide() / proposerAide() — méthodes du diagramme
async function proposerAide(req, res) {
    try {
        const validation = propositionAideSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json({ errors: validation.error.flatten() });

        const demande = await DemandeAide.findById(req.body.demandeAideId).populate('femme', 'nom _id');
        if (!demande) return res.status(404).json({ status: false, message: 'Demande introuvable' });
        if (demande.statut !== 'VALIDEE' && demande.statut !== 'EN_COURS')
            return res.status(400).json({ status: false, message: 'Cette demande n\'accepte plus de propositions' });

        const existante = await PropositionAide.findOne({ demandeAide: req.body.demandeAideId, proposeur: req.user._id, statut: 'PROPOSEE' });
        if (existante) return res.status(409).json({ status: false, message: 'Vous avez déjà une proposition en cours pour cette demande' });

        const proposition = await PropositionAide.create({
            description:    req.body.description,
            demandeAide:    req.body.demandeAideId,
            proposeur:      req.user._id,
            montantPropose: req.body.montantPropose || null,
        });

        await Notification.create({
            message: `${req.user.nom} a proposé de l'aide pour votre demande "${demande.titre}".`,
            destinataire: demande.femme._id,
            expediteur:   req.user._id,
            type: 'PROPOSITION',
            lien: `/demandes/${demande._id}`
        });

        await saveLog({ action: `${req.user.nom} a proposé une aide pour "${demande.titre}"`, actorId: req.user._id });
        res.status(201).json({ status: true, message: 'Proposition envoyée', proposition });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function propositionsParDemande(req, res) {
    try {
        const props = await PropositionAide.find({ demandeAide: req.params.demandeId })
            .populate('proposeur', 'nom avatar role competences nomOrganisation telephone')
            .sort({ createdAt: -1 });
        res.status(200).json({ status: true, propositions: props });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function mesPropositions(req, res) {
    try {
        const props = await PropositionAide.find({ proposeur: req.user._id })
            .populate('demandeAide', 'titre type statut femme')
            .sort({ createdAt: -1 });
        res.status(200).json({ status: true, propositions: props });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function propositionsRecues(req, res) {
    try {
        const demandes = await DemandeAide.find({ femme: req.user._id }).select('_id');
        const ids = demandes.map(d => d._id);
        const props = await PropositionAide.find({ demandeAide: { $in: ids } })
            .populate('proposeur', 'nom avatar role competences nomOrganisation')
            .populate('demandeAide', 'titre type')
            .sort({ createdAt: -1 });
        res.status(200).json({ status: true, propositions: props });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

// PropositionAide.accepter() — méthode du diagramme
async function accepterProposition(req, res) {
    try {
        const prop = await PropositionAide.findById(req.params.id).populate('demandeAide proposeur', 'titre nom _id');
        if (!prop) return res.status(404).json({ status: false, message: 'Proposition non trouvée' });

        const demande = await DemandeAide.findById(prop.demandeAide._id).populate('femme', '_id');
        if (demande.femme._id.toString() !== req.user._id.toString())
            return res.status(403).json({ status: false, message: 'Non autorisé' });

        await prop.accepter(); // méthode du diagramme
        await Notification.create({
            message: `${req.user.nom} a accepté votre proposition pour "${prop.demandeAide.titre}". Vous pouvez maintenant vous contacter.`,
            destinataire: prop.proposeur._id,
            expediteur:   req.user._id,
            type: 'PROPOSITION',
            lien: `/app/messages/${req.user._id}`
        });
        await saveLog({ action: `${req.user.nom} a accepté une proposition de ${prop.proposeur.nom}`, actorId: req.user._id });
        res.status(200).json({ status: true, message: 'Proposition acceptée', proposition: prop });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

// PropositionAide.refuser() — méthode du diagramme
async function refuserProposition(req, res) {
    try {
        const prop = await PropositionAide.findById(req.params.id).populate('demandeAide', 'titre femme');
        if (!prop) return res.status(404).json({ status: false, message: 'Proposition non trouvée' });
        const demande = await DemandeAide.findById(prop.demandeAide._id).populate('femme', '_id');
        if (demande.femme._id.toString() !== req.user._id.toString())
            return res.status(403).json({ status: false, message: 'Non autorisé' });
        await prop.refuser(); // méthode du diagramme
        res.status(200).json({ status: true, message: 'Proposition refusée' });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

module.exports = { proposerAide, propositionsParDemande, mesPropositions, propositionsRecues, accepterProposition, refuserProposition };
