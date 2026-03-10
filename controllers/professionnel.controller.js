const Professionnel = require('../models/professionnel.model');

async function lister(req, res) {
    try {
        const { role, search } = req.query;
        const filtre = {};
        if (role) filtre.role = role;
        if (search) {
            filtre.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { prenom: { $regex: search, $options: 'i' } },
                { specialite: { $regex: search, $options: 'i' } },
            ];
        }
        const professionnels = await Professionnel.find(filtre).sort({ nom: 1 });
        return res.json({ status: true, professionnels });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function creer(req, res) {
    try {
        const pro = await Professionnel.create({ ...req.body, ajoute_par: req.user._id });
        return res.status(201).json({ status: true, professionnel: pro });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function modifier(req, res) {
    try {
        const pro = await Professionnel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!pro) return res.status(404).json({ status: false, message: 'Introuvable' });
        return res.json({ status: true, professionnel: pro });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function supprimer(req, res) {
    try {
        await Professionnel.findByIdAndDelete(req.params.id);
        return res.json({ status: true, message: 'Supprime' });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

module.exports = { lister, creer, modifier, supprimer };
