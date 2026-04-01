const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { lowercase } = require("zod");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "First Name is required"],
      trim: true, //anuler espace
    },
    lastName: {
      type: String,
      required: [true, "Last Name is required"],
      trim: true,
    },
    telephone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 chars"],
      select: false, // prevents password from being called in the queris
    },
    confirmPassword: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 chars"],
      select: false,
    },
    dob: {
      type: Date,
    },
    role: {
      type: String,
      enum: [
        "USER",
        "VISITEUR",
        "FEMME MALADE",
        "ADMINISTRATEUR",
        "BENEVOLE",
        "DONTEUR",
        "ASSOCIATION",
      ],
      default: "USER",
    },
    avatar: {
      type: String,
    },
    dateDiagnostic: {
      type: Date,
    },
    region: {
      type: String,
      trim: true,
    },
    nomOrganisation: {
      type: String,
      trim: true,
    },
    adresse: {
      type: String,
      trim: true,
    },
    competences: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  // Modifiction password
  if (!this.isModified("password")) {
    this.confirmPassword = undefined;
    return next();
  }
  // pre-hook

  // Comapring and Hashing Passwords
  if (this.password !== this.confirmPassword) {
    throw new Error("Passwords doesn't match");
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(this.password, salt);

  this.confirmPassword = undefined;
});
// compare passwoed
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const userModel = mongoose.model("users", userSchema);

module.exports = userModel;
