const mongoose = require('mongoose');

const propositionAideSchema = new mongoose.Schema({
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
  }
}, { timestamps: true });

const propositionAideModel = mongoose.model('propositionsAide', propositionAideSchema);
module.exports = propositionAideModel;