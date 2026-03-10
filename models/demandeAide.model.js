const mongoose = require('mongoose');

// =========== DemandeAide selon diagramme ===========
// Attributs : id, titre, description, type:TypeDemande, dateCreation:DateTime, statut:StatutDemande
// Enum TypeDemande : FINANCIERE, MATERIELLE, ACCOMPAGNEMENT, LOGEMENT
// Enum StatutDemande : EN_ATTENTE, VALIDEE, REFUSEE, EN_COURS, TERMINEE
// Relations : 1 Femme dépose 0..* DemandeAide
//             1 Administrateur valide 0..* DemandeAide
//             1 DemandeAide finance 0..1 Don
//             1 DemandeAide propose 0..* PropositionAide

const demandeAideSchema = new mongoose.Schema({
    titre: {
        type: String,
        required: [true, 'Le titre est requis'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'La description est requise']
    },
    // Enum TypeDemande du diagramme
    type: {
        type: String,
        enum: ['FINANCIERE', 'MATERIELLE', 'ACCOMPAGNEMENT', 'LOGEMENT'],
        required: [true, 'Le type est requis']
    },
    dateCreation: {
        type: Date,
        default: Date.now
    },
    // Enum StatutDemande du diagramme
    statut: {
        type: String,
        enum: ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'EN_COURS', 'TERMINEE'],
        default: 'EN_ATTENTE'
    },
    // Relation : Femme dépose DemandeAide
    femme: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        required: true
    },
    // Relation : Administrateur valide DemandeAide
    administrateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        default: null
    },
    // Champs complémentaires
    region: { type: String, default: null },
    montantDemande: { type: Number, default: null }, // pour FINANCIERE
    montantCollecte: { type: Number, default: 0 },
    documents: [{ type: String }],
    urgence: {
        type: String,
        enum: ['FAIBLE', 'MOYENNE', 'HAUTE', 'CRITIQUE'],
        default: 'MOYENNE'
    },
    vues: { type: Number, default: 0 },
    dateEcheance: { type: Date, default: null },
}, { timestamps: true });

// Méthode modifierStatut du diagramme
demandeAideSchema.methods.modifierStatut = function (nouveauStatut) {
    this.statut = nouveauStatut;
    return this.save();
};

const DemandeAide = mongoose.model('demandesAide', demandeAideSchema);
module.exports = DemandeAide;
