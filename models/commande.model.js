const mongoose = require('mongoose');

const ligneCommandeSchema = new mongoose.Schema({
    produit:  { type: mongoose.Schema.Types.ObjectId, ref: 'produits', required: true },
    nom:      { type: String, required: true },
    prix:     { type: Number, required: true },
    quantite: { type: Number, required: true, min: 1 },
    sousTotal:{ type: Number, required: true },
}, { _id: false });

const commandeSchema = new mongoose.Schema({
    acheteur:       { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs', required: true },
    lignes:         [ligneCommandeSchema],
    total:          { type: Number, required: true },
    fraisLivraison: { type: Number, default: 7 },
    statut: {
        type: String,
        enum: ['EN_ATTENTE_PAIEMENT', 'PAYEE', 'EN_COURS_DE_TRAITEMENT', 'EXPEDIEE', 'LIVREE', 'ANNULEE'],
        default: 'EN_ATTENTE_PAIEMENT'
    },
    adresseLivraison: {
        nom:       { type: String },
        adresse:   { type: String },
        ville:     { type: String },
        telephone: { type: String },
        email:     { type: String },
    },
    paiement: {
        methode:    { type: String, default: 'CARTE' },
        confirme:   { type: Boolean, default: false },
        dateConfirmation: { type: Date, default: null },
    },
}, { timestamps: true });

module.exports = mongoose.model('commandes', commandeSchema);
