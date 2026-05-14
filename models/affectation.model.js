const mongoose = require('mongoose');

const affectationSchema = new mongoose.Schema({
  dateAffectation: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['INVITATION', 'CANDIDATURE'],
    default: 'CANDIDATURE'
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'TERMINEE'],
    default: 'EN_ATTENTE'
  },
  benevole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  action: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'actionsSolidaires',
    required: false
  },
  demande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'demandes'
  },
  femme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  }
}, { timestamps: true });

const affectationModel = mongoose.model('affectations', affectationSchema);
module.exports = affectationModel;