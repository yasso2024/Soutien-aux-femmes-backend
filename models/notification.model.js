const mongoose = require('mongoose');



const NOTIFICATION_TYPES = [
  // Association
  'demande_nouvelle',       // nouvelle demande d'aide reçue
  'benevole_inscrit',       // bénévole s'inscrit à une action de l'asso
  'proposition_acceptee',   // proposition d'aide acceptée par la femme
  'proposition_rejetee',    // proposition d'aide refusée par la femme
  // Bénévole
  'affectation',            // affectation à une mission
  'nouvelle_action',        // nouvelle action solidaire disponible
  'participation_confirmee',// participation confirmée
  'participation_annulee',  // participation annulée / refusée
  // Donateur
  'don_enregistre',         // don enregistré avec succès
  'don_confirme',           // don validé par l'admin
  'don_refuse',             // don refusé
  'don_suivi',              // mise à jour de l'utilisation du don
  // Administrateur
  'demande_en_attente',     // demande en attente de validation
  'action_a_valider',       // action solidaire à valider
  'new_user',               // nouvel utilisateur inscrit
  'new_association',        // nouvelle association inscrite
  'activite_importante',    // activité importante sur la plateforme
  // Femme malade
  'demande_acceptee',       // demande acceptée
  'demande_rejetee',        // demande refusée
  'demande_en_cours',       // demande en cours de traitement
  'demande_terminee',       // demande clôturée
  'proposition_aide',       // proposition d'aide reçue d'une asso
  'affectation_confirmee',  // accompagnement/affectation confirmé
  // Général
  'don_reçu',               // alias pour back-compat
  'info',
];

const notificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    default: 'info'
  },
  lien: {
    type: String,
    trim: true
  },
  dateEnvoi: {
    type: Date,
    default: Date.now
  },
  lu: {
    type: Boolean,
    default: false
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  }
}, { timestamps: true });

const notificationModel = mongoose.model('notifications', notificationSchema);
module.exports = notificationModel;