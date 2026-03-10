const mongoose = require('mongoose');

const professionnelSchema = new mongoose.Schema({
    nom:       { type: String, required: true, trim: true },
    prenom:    { type: String, required: true, trim: true },
    email:     { type: String, required: true, lowercase: true },
    telephone: { type: String, default: null },
    adresse:   { type: String, default: null },
    role:      {
        type: String,
        enum: ['MEDECIN', 'INFIRMIER', 'PSYCHOLOGUE', 'KINESITHERAPEUTE', 'NUTRITIONNISTE', 'AUTRE'],
        default: 'MEDECIN'
    },
    specialite:  { type: String, default: null },
    disponible:  { type: Boolean, default: true },
    ajoute_par:  { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs' },
}, { timestamps: true });

module.exports = mongoose.model('professionnels', professionnelSchema);
