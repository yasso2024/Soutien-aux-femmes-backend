const mongoose = require('mongoose');

const SERVICES = [
  'SOUTIEN_PSYCHOLOGIQUE',
  'AIDE_ADMINISTRATIVE',
  'FORMATION_INFORMATIQUE',
  'COUTURE',
  'ENSEIGNEMENT',
  'ACCOMPAGNEMENT_MEDICAL',
  'ACTIVITES_ENFANTS',
  'AUTRE',
];

const profilBenevoleSchema = new mongoose.Schema(
  {
    benevole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    competences: [{ type: String, trim: true }],
    services: [{ type: String, enum: SERVICES }],
    disponibilite: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    experience: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    langues: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('profilsBenevoles', profilBenevoleSchema);
