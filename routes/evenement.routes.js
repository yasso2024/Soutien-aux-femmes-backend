const express = require("express");
const router = express.Router();

const {
  getAllEvenements,
  getEvenementById,
  createEvenement,
  updateEvenement,
  deleteEvenement,
  inscrireEvenement,
} = require("../controllers/evenement.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get("/", getAllEvenements);
router.get("/:id", getEvenementById);
router.post("/", createEvenement);
router.put("/:id", updateEvenement);
router.delete("/:id", deleteEvenement);
router.put("/:id/inscrire", protect, inscrireEvenement);

module.exports = router;