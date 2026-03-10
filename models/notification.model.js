const mongoose = require('mongoose');


const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: [true, 'Le message est requis']
    },
    dateEnvoi: {
        type: Date,
        default: Date.now
    },
    // lu : boolean 
    lu: {
        type: Boolean,
        default: false
    },
    // Relation : Utilisateur recoit Notification
    destinataire: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        required: true
    },
    // Qui a déclenché la notification (optionnel)
    expediteur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        default: null
    },
    type: {
        type: String,
        enum: ['PROPOSITION', 'DON', 'STATUT_DEMANDE', 'ACTION', 'SYSTEME', 'MESSAGE'],
        default: 'SYSTEME'
    },
    lien: { type: String, default: null }, // lien vers la ressource concernée
}, { timestamps: true });

// Méthode marquerCommeLue() du diagramme
notificationSchema.methods.marquerCommeLue = function () {
    this.lu = true;
    return this.save();
};

const Notification = mongoose.model('notifications', notificationSchema);
module.exports = Notification;
