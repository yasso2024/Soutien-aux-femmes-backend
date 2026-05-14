const mongoose = require('mongoose');

const propositionAideSchema = new mongoose.Schema({
  titre: {
    type: String,
    trim: true
  },
  typeAide: {
    type: String,
    enum: ['Transport', 'Alimentation', 'Soins', 'Soutien psychologique', 'Administratif', 'Financier', 'Autre'],
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  dateProposition: {
    type: Date,
    default: Date.now
  },
  statut: {
    type: String,
    enum: ['PROPOSEE', 'ACCEPTEE', 'REFUSEE'],
    default: 'PROPOSEE'
  },
  demande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'demandes',
    required: false
  },
  association: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  femme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: false
  },
  accepted_by_femme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: false
  },
  refused_by: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  }]
}, { timestamps: true });

const propositionAideModel = mongoose.model('propositionsAide', propositionAideSchema);
module.exports = propositionAideModel;