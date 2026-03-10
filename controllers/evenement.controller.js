const Evenement = require('../models/evenement.model');
const { saveLog } = require('../utils/logger');

async function creerEvenement(req, res) {
    try {
        const ev = await Evenement.create({ ...req.body, createur: req.user._id });
        await saveLog({ action: `${req.user.nom} a créé l'événement "${ev.titre}"`, actorId: req.user._id });
        res.status(201).json({ status: true, evenement: ev });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function listerEvenements(req, res) {
    try {
        const { debut, fin } = req.query;
        const filtre = {};
        // Toujours retourner les événements du créateur + ceux où il est participant
        filtre.$or = [
            { createur: req.user._id },
            { participants: req.user._id }
        ];
        if (debut) filtre.dateDebut = { $gte: new Date(debut) };
        if (fin)   filtre.dateDebut = { ...filtre.dateDebut, $lte: new Date(fin) };
        const evenements = await Evenement.find(filtre)
            .populate('createur', 'nom avatar role')
            .populate('participants', 'nom avatar role')
            .sort({ dateDebut: 1 });
        res.status(200).json({ status: true, evenements });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function obtenirEvenement(req, res) {
    try {
        const ev = await Evenement.findById(req.params.id)
            .populate('createur', 'nom avatar role')
            .populate('participants', 'nom avatar role');
        if (!ev) return res.status(404).json({ status: false, message: 'Événement non trouvé' });
        res.status(200).json({ status: true, evenement: ev });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function modifierEvenement(req, res) {
    try {
        const ev = await Evenement.findById(req.params.id);
        if (!ev) return res.status(404).json({ status: false, message: 'Événement non trouvé' });
        if (ev.createur.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN')
            return res.status(403).json({ status: false, message: 'Non autorisé' });
        const mis = await Evenement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ status: true, evenement: mis });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function supprimerEvenement(req, res) {
    try {
        const ev = await Evenement.findById(req.params.id);
        if (!ev) return res.status(404).json({ status: false, message: 'Événement non trouvé' });
        if (ev.createur.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN')
            return res.status(403).json({ status: false, message: 'Non autorisé' });
        await ev.deleteOne();
        res.status(204).json();
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

module.exports = { creerEvenement, listerEvenements, obtenirEvenement, modifierEvenement, supprimerEvenement };
