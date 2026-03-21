const mongoose = require('mongoose');

const demandeSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['FINANCIERE', 'MATERIELLE', 'ACCOMPAGNEMENT', 'LOGEMENT'],
    required: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'EN_COURS', 'TERMINEE'],
    default: 'EN_ATTENTE'
  },

  femme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },

  validePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
 don: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'dons'
  }
 
}, { timestamps: true });

const demandeModel = mongoose.model('demandes', demandeSchema);
module.exports = demandeModel;