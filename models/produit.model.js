const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema({
    nom:         { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    prix:        { type: Number, required: true, min: 0 },
    quantite:    { type: Number, default: 0, min: 0 },
    image:       { type: String, default: null },
    categorie:   { type: String, enum: ['ARTISANAT', 'VETEMENTS', 'ACCESSOIRES', 'LIVRES', 'AUTRE'], default: 'AUTRE' },
    vendeur:     { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs', required: true },
    actif:       { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('produits', produitSchema);
