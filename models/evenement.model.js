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
    },
    rappelActive: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Evenement", evenementSchema);