const Commande = require('../models/commande.model');
const Produit  = require('../models/produit.model');
const { saveLog } = require('../utils/logger');

async function passerCommande(req, res) {
    try {
        const { lignes, adresseLivraison } = req.body;
        let total = 0;
        const lignesDetails = [];
        for (const l of lignes) {
            const produit = await Produit.findById(l.produitId);
            if (!produit) return res.status(404).json({ status: false, message: `Produit introuvable: ${l.produitId}` });
            const sousTotal = produit.prix * l.quantite;
            total += sousTotal;
            lignesDetails.push({ produit: produit._id, nom: produit.nom, prix: produit.prix, quantite: l.quantite, sousTotal });
        }
        const commande = await Commande.create({
            acheteur: req.user._id,
            lignes: lignesDetails,
            total,
            fraisLivraison: 7,
            adresseLivraison,
            statut: 'EN_ATTENTE_PAIEMENT'
        });
        await saveLog({ action: `Commande passee: ${commande._id}`, actorId: req.user._id });
        return res.status(201).json({ status: true, commande });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function payerCommande(req, res) {
    try {
        const commande = await Commande.findById(req.params.id);
        if (!commande) return res.status(404).json({ status: false, message: 'Commande introuvable' });
        commande.statut = 'EN_COURS_DE_TRAITEMENT';
        commande.paiement.confirme = true;
        commande.paiement.dateConfirmation = new Date();
        await commande.save();
        await saveLog({ action: `Paiement commande: ${commande._id}`, actorId: req.user._id });
        return res.json({ status: true, commande, message: 'Paiement confirme !' });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function mesCommandes(req, res) {
    try {
        const commandes = await Commande.find({ acheteur: req.user._id })
            .populate('lignes.produit', 'nom image')
            .sort({ createdAt: -1 });
        return res.json({ status: true, commandes });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

async function toutesCommandes(req, res) {
    try {
        const commandes = await Commande.find()
            .populate('acheteur', 'nom prenom email telephone')
            .populate('lignes.produit', 'nom')
            .sort({ createdAt: -1 });
        return res.json({ status: true, commandes });
    } catch (e) {
        return res.status(500).json({ status: false, message: 'Erreur serveur' });
    }
}

module.exports = { passerCommande, payerCommande, mesCommandes, toutesCommandes };
