const mongoose = require('mongoose');

// =========== Affectation selon diagramme ===========
// Attributs : id, dateAffectation:Date, statut:StatutAffectation
// Enum StatutAffectation : EN_ATTENTE, ACCEPTEE, TERMINEE
// Relations : 0..* Affectation ↔ ActionSolidaire
//             0..* Affectation ↔ DemandeAide
// Méthodes : confirmerParticipation()

const affectationSchema = new mongoose.Schema({
    dateAffectation: {
        type: Date,
        default: Date.now
    },
    // Enum StatutAffectation du diagramme
    statut: {
        type: String,
        enum: ['EN_ATTENTE', 'ACCEPTEE', 'TERMINEE'],
        default: 'EN_ATTENTE'
    },
    // Relation avec ActionSolidaire
    actionSolidaire: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'actionsSolidaires',
        default: null
    },
    // Relation avec DemandeAide
    demandeAide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'demandesAide',
        default: null
    },
    // Bénévole ou utilisateur affecté
    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        required: true
    },
    notes: { type: String, default: null },
}, { timestamps: true });

// Méthode confirmerParticipation() du diagramme
affectationSchema.methods.confirmerParticipation = function () {
    this.statut = 'ACCEPTEE';
    return this.save();
};

const Affectation = mongoose.model('affectations', affectationSchema);
module.exports = Affectation;
