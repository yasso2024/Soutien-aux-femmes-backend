const mongoose = require('mongoose');

// =========== ActionSolidaire selon diagramme ===========
// Attributs : id, titre:String, description:String, dateAction:Date
// Relations : 1 Association organise 0..* ActionSolidaire
//             0..* Benevole participe à ActionSolidaire (via Affectation)
//             1 ActionSolidaire propose 0..* DemandeAide (lien indirect)
// Méthodes : inscrireBenevole()

const actionSolidaireSchema = new mongoose.Schema({
    titre: {
        type: String,
        required: [true, 'Le titre est requis'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'La description est requise']
    },
    dateAction: {
        type: Date,
        required: [true, 'La date de l\'action est requise']
    },
    // Relation : Association organise ActionSolidaire
    association: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        required: true
    },
    lieu: { type: String, default: null },
    statut: {
        type: String,
        enum: ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'],
        default: 'PLANIFIEE'
    },
    nombrePlaces: { type: Number, default: null },
    typeAction: {
        type: String,
        enum: ['COLLECTE', 'SENSIBILISATION', 'ACCOMPAGNEMENT', 'FORMATION', 'AUTRE'],
        default: 'AUTRE'
    }
}, { timestamps: true });

// Méthode inscrireBenevole() du diagramme
actionSolidaireSchema.methods.inscrireBenevole = async function (benevoleId) {
    const Affectation = require('./affectation.model');
    const existing = await Affectation.findOne({ actionSolidaire: this._id, utilisateur: benevoleId });
    if (existing) throw new Error('Ce bénévole est déjà inscrit');
    return Affectation.create({
        actionSolidaire: this._id,
        utilisateur: benevoleId,
        statut: 'EN_ATTENTE'
    });
};

const ActionSolidaire = mongoose.model('actionsSolidaires', actionSolidaireSchema);
module.exports = ActionSolidaire;
