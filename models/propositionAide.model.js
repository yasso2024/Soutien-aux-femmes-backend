const mongoose = require('mongoose');

// =========== PropositionAide selon diagramme ===========
// Attributs : id, description, dateProposition:DateTime, statut:StatutProposition
// Enum StatutProposition : PROPOSEE, ACCEPTEE, REFUSEE
// Relations : 1 DemandeAide recoit 0..* PropositionAide
//             (proposée par Benevole ou Association)
// Méthodes : accepter(), refuser()

const propositionAideSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'La description est requise'],
        minlength: [10, 'La description doit contenir au moins 10 caractères']
    },
    dateProposition: {
        type: Date,
        default: Date.now
    },
    // Enum StatutProposition du diagramme
    statut: {
        type: String,
        enum: ['PROPOSEE', 'ACCEPTEE', 'REFUSEE'],
        default: 'PROPOSEE'
    },
    // Relation : DemandeAide recoit PropositionAide
    demandeAide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'demandesAide',
        required: true
    },
    // Qui propose (Benevole ou Association)
    proposeur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        required: true
    },
    // Référence à l'ActionSolidaire si proposée via une action
    actionSolidaire: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'actionsSolidaires',
        default: null
    },
    montantPropose: { type: Number, default: null },
    notes: { type: String, default: null },
}, { timestamps: true });

// Méthode accepter() du diagramme
propositionAideSchema.methods.accepter = function () {
    this.statut = 'ACCEPTEE';
    return this.save();
};

// Méthode refuser() du diagramme
propositionAideSchema.methods.refuser = function () {
    this.statut = 'REFUSEE';
    return this.save();
};

const PropositionAide = mongoose.model('propositionsAide', propositionAideSchema);
module.exports = PropositionAide;
