const Produit = require('../models/produit.model');
const { saveLog } = require('../utils/logger');

async function listerProduits(req, res) {
    try {
        const { categorie, search, actif } = req.query;
        const filtre = {};
        if (actif !== 'false') filtre.actif = true;
        if (categorie) filtre.categorie = categorie;
        if (search) filtre.nom = { $regex: search, $options: 'i' };
        const produits = await Produit.find(filtre)
            .populate('vendeur', 'nom email')
            .sort({ createdAt: -1 });
        return res.json({ status: true, produits });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function obtenirProduit(req, res) {
    try {
        const produit = await Produit.findById(req.params.id).populate('vendeur', 'nom email');
        if (!produit) return res.status(404).json({ status: false, message: 'Produit introuvable' });
        return res.json({ status: true, produit });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function creerProduit(req, res) {
    try {
        const { nom, description, prix, quantite, categorie } = req.body;
        const image = req.file ? req.file.filename : null;
        const produit = await Produit.create({
            nom, description, prix, quantite, categorie,
            image, vendeur: req.user._id
        });
        await saveLog({ action: `Nouveau produit: ${nom}`, actorId: req.user._id });
        return res.status(201).json({ status: true, produit });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function modifierProduit(req, res) {
    try {
        const produit = await Produit.findById(req.params.id);
        if (!produit) return res.status(404).json({ status: false, message: 'Produit introuvable' });
        if (String(produit.vendeur) !== String(req.user._id) && req.user.role !== 'ADMIN')
            return res.status(403).json({ status: false, message: 'Non autorise' });
        const updates = req.body;
        if (req.file) updates.image = req.file.filename;
        Object.assign(produit, updates);
        await produit.save();
        return res.json({ status: true, produit });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function supprimerProduit(req, res) {
    try {
        await Produit.findByIdAndDelete(req.params.id);
        return res.json({ status: true, message: 'Produit supprime' });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function mesProduits(req, res) {
    try {
        const produits = await Produit.find({ vendeur: req.user._id }).sort({ createdAt: -1 });
        return res.json({ status: true, produits });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

module.exports = { listerProduits, obtenirProduit, creerProduit, modifierProduit, supprimerProduit, mesProduits };
