const mongoose = require("mongoose");

const evenementSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: [true, "Le titre est obligatoire"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    lieu: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "RENDEZ_VOUS_MEDICAL",
        "TRAITEMENT",
        "ACTION_SOLIDAIRE",
        "REUNION_ASSOCIATION",
        "RAPPEL",
      ],
      required: [true, "Le type est obligatoire"],
    },
    dateDebut: {
      type: Date,
      required: [true, "La date de début est obligatoire"],
    },
    dateFin: {
      type: Date,
      required: [true, "La date de fin est obligatoire"],
      validate: {
        validator: function (value) {
          return !this.dateDebut || value >= this.dateDebut;
        },
        message: "La date de fin doit être après la date de début",
      },
    },
    organisateur: {
      type: String,
      default: "",
      trim: true,
    },
    heure: {
      type: String,
      default: "",
      trim: true,
    },
    contact: {
      type: String,
      default: "",
      trim: true,
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rappelActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Evenement", evenementSchema);