const mongoose = require('mongoose');

const actionSolidaireSchema = new mongoose.Schema({
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
  dateAction: {
    type: Date,
    required: true
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'TERMINEE'],
    default: 'EN_ATTENTE'
  },
  association: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  lieu: {
    type: String,
    trim: true
  },
  demande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'demandes',
    default: null
  },
  maxBenevoles: {
    type: Number,
    min: 1,
    default: null
  },
  benevoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  }],
  benevoleResponsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    default: null
  },
  dateParticipation: {
    type: Date,
    default: null
  }
}, { timestamps: true });

const actionSolidaireModel = mongoose.model('actionsSolidaires', actionSolidaireSchema);
module.exports = actionSolidaireModel;