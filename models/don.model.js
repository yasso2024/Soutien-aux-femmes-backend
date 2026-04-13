const mongoose = require('mongoose');

const donSchema = new mongoose.Schema({
  montant: {
    type: Number,
    default: 0
  },
  dateDon: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['FINANCIER', 'MATERIEL'],
    required: true
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'CONFIRME', 'REFUSE'],
    default: 'EN_ATTENTE'
  },
  donateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  demande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'demandes'
  }
}, { timestamps: true });

const donModel = mongoose.model('dons', donSchema);
module.exports = donModel;