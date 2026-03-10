const Don = require('../models/don.model');
const DemandeAide = require('../models/demandeAide.model');
const Notification = require('../models/notification.model');
const { donSchema } = require('../schemas/don.schema');
const { saveLog } = require('../utils/logger');

// effectuerDon() — méthode Donateur du diagramme
async function effectuerDon(req, res) {
    try {
        const validation = donSchema.safeParse({
            ...req.body,
            montant: Number(req.body.montant)
        });
        if (!validation.success) return res.status(400).json({ errors: validation.error.flatten() });

        const don = await Don.create({
            montant: Number(req.body.montant),
            type: req.body.type || 'FINANCIER',
            donateur: req.user._id,
            demandeAide: req.body.demandeAideId || null,
            description: req.body.description || null,
        });

        // confirmerDon() — méthode Don du diagramme
        await don.confirmerDon();

        // Notifier la femme si don lié à une demande
        if (req.body.demandeAideId) {
            const demande = await DemandeAide.findById(req.body.demandeAideId).populate('femme', 'nom');
            if (demande) {
                await Notification.create({
                    message: `${req.user.nom} a effectué un don de ${don.montant} DT pour votre demande "${demande.titre}".`,
                    destinataire: demande.femme._id,
                    expediteur: req.user._id,
                    type: 'DON',
                    lien: `/demandes/${demande._id}`
                });
            }
        }

        await saveLog({ action: `${req.user.nom} a effectué un don de ${don.montant} DT`, actorId: req.user._id });
        res.status(201).json({ status: true, message: "Don effectué avec succès", don });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function mesDons(req, res) {
    try {
        const dons = await Don.find({ donateur: req.user._id })
            .populate('demandeAide', 'titre type statut')
            .sort({ createdAt: -1 });
        res.status(200).json({ status: true, dons });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function listerDons(req, res) {
    try {
        const { page = 1, limit = 20 } = req.query;
        const total = await Don.countDocuments();
        const dons = await Don.find()
            .populate('donateur', 'nom email role')
            .populate('demandeAide', 'titre type')
            .skip((page - 1) * limit).limit(Number(limit))
            .sort({ createdAt: -1 });
        res.status(200).json({ status: true, dons, total });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { effectuerDon, mesDons, listerDons };
