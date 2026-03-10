const DemandeAide = require('../models/demandeAide.model');
const Notification = require('../models/notification.model');
const { demandeAideSchema } = require('../schemas/demandeAide.schema');
const { saveLog } = require('../utils/logger');

// deposerDemande() — méthode Femme du diagramme
async function deposerDemande(req, res) {
    try {
        const validation = demandeAideSchema.safeParse({
            ...req.body,
            montantDemande: req.body.montantDemande ? Number(req.body.montantDemande) : undefined,
        });
        if (!validation.success) return res.status(400).json({ errors: validation.error.flatten() });

        const documents = req.files ? req.files.map(f => f.filename) : [];
        const demande = await DemandeAide.create({
            titre: req.body.titre,
            description: req.body.description,
            type: req.body.type,
            urgence: req.body.urgence || 'MOYENNE',
            region: req.body.region || req.user.region || null,
            montantDemande: req.body.montantDemande ? Number(req.body.montantDemande) : null,
            dateEcheance: req.body.dateEcheance || null,
            femme: req.user._id,
            documents,
        });

        await saveLog({ action: `${req.user.nom} a déposé une demande: "${demande.titre}"`, actorId: req.user._id });
        res.status(201).json({ status: true, message: "Demande déposée avec succès", demande });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

// consulterDemandes() — méthode Femme du diagramme (liste filtrée)
async function listerDemandes(req, res) {
    try {
        const { type, statut, urgence, region, search, page = 1, limit = 12 } = req.query;
        const filtre = {};
        if (type) filtre.type = type;
        if (urgence) filtre.urgence = urgence;
        if (statut) filtre.statut = statut;
        else filtre.statut = { $in: ['VALIDEE', 'EN_COURS'] };
        if (region) filtre.region = new RegExp(region, 'i');
        if (search) filtre.$or = [
            { titre: new RegExp(search, 'i') },
            { description: new RegExp(search, 'i') }
        ];

        const total = await DemandeAide.countDocuments(filtre);
        const demandes = await DemandeAide.find(filtre)
            .populate('femme', 'nom avatar region telephone')
            .skip((page - 1) * limit).limit(Number(limit))
            .sort({ urgence: -1, createdAt: -1 });

        res.status(200).json({ status: true, demandes, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function obtenirDemande(req, res) {
    try {
        const demande = await DemandeAide.findById(req.params.id)
            .populate('femme', 'nom avatar region telephone competences dateDiagnostic')
            .populate('administrateur', 'nom');
        if (!demande) return res.status(404).json({ status: false, message: "Demande non trouvée" });
        demande.vues += 1;
        await demande.save();
        res.status(200).json({ status: true, demande });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function mesDemandes(req, res) {
    try {
        const demandes = await DemandeAide.find({ femme: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ status: true, demandes });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

// validerDemande() — méthode Administrateur du diagramme
async function validerDemande(req, res) {
    try {
        const { statut } = req.body;
        const valides = ['VALIDEE', 'REFUSEE', 'EN_COURS', 'TERMINEE', 'EN_ATTENTE'];
        if (!valides.includes(statut)) return res.status(400).json({ status: false, message: "Statut invalide" });

        const demande = await DemandeAide.findById(req.params.id).populate('femme', 'nom email');
        if (!demande) return res.status(404).json({ status: false, message: "Demande non trouvée" });

        // Utilise modifierStatut() du diagramme
        await demande.modifierStatut(statut);
        demande.administrateur = req.user._id;
        await demande.save();

        // Notification à la femme
        await Notification.create({
            message: `Votre demande "${demande.titre}" a été ${statut === 'VALIDEE' ? 'validée' : statut === 'REFUSEE' ? 'refusée' : 'mise à jour'}.`,
            destinataire: demande.femme._id,
            expediteur: req.user._id,
            type: 'STATUT_DEMANDE',
            lien: `/demandes/${demande._id}`
        });

        await saveLog({ action: `${req.user.nom} a changé le statut de "${demande.titre}" → ${statut}`, actorId: req.user._id });
        res.status(200).json({ status: true, message: "Statut mis à jour", demande });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function supprimerDemande(req, res) {
    try {
        const demande = await DemandeAide.findById(req.params.id);
        if (!demande) return res.status(404).json({ status: false, message: "Demande non trouvée" });
        if (demande.femme.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
            return res.status(403).json({ status: false, message: "Non autorisé" });
        }
        await demande.deleteOne();
        res.status(204).json();
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function statistiquesDemandes(req, res) {
    try {
        const [total, enAttente, validees, refusees, enCours, terminees] = await Promise.all([
            DemandeAide.countDocuments(),
            DemandeAide.countDocuments({ statut: 'EN_ATTENTE' }),
            DemandeAide.countDocuments({ statut: 'VALIDEE' }),
            DemandeAide.countDocuments({ statut: 'REFUSEE' }),
            DemandeAide.countDocuments({ statut: 'EN_COURS' }),
            DemandeAide.countDocuments({ statut: 'TERMINEE' }),
        ]);
        res.status(200).json({ status: true, stats: { total, enAttente, validees, refusees, enCours, terminees } });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { deposerDemande, listerDemandes, obtenirDemande, mesDemandes, validerDemande, supprimerDemande, statistiquesDemandes };
