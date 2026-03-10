const mongoose = require('mongoose');

/**
 * Evenement — extension du diagramme
 * Lié à : ActionSolidaire, Utilisateur (ASSOCIATION, BENEVOLE, ADMIN)
 * Type: CONSULTATION, ACTION, REUNION, TRANSPORT, FORMATION, AUTRE
 */
const evenementSchema = new mongoose.Schema({
    titre:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dateDebut:   { type: Date, required: true },
    dateFin:     { type: Date, default: null },
    lieu:        { type: String, default: null },
    type: {
        type: String,
        enum: ['CONSULTATION', 'ACTION', 'REUNION', 'TRANSPORT', 'FORMATION', 'AUTRE'],
        default: 'AUTRE'
    },
    couleur: { type: String, default: '#e91e8c' },
    createur: { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs' }],
    actionSolidaire: { type: mongoose.Schema.Types.ObjectId, ref: 'actionsSolidaires', default: null },
    statut: {
        type: String,
        enum: ['PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE'],
        default: 'PLANIFIE'
    },
}, { timestamps: true });

module.exports = mongoose.model('evenements', evenementSchema);
