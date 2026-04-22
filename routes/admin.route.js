const express = require("express");
const router = express.Router();

const userModel = require("../models/user.model");
const demandeModel = require("../models/demande.model");
const donModel = require("../models/don.model");
const logModel = require("../models/log.model");

router.get("/dashboard-stats", async (req, res) => {
  try {
    console.log('[ADMIN] /dashboard-stats endpoint called');
    const totalUsers = await userModel.countDocuments();
    const totalFemmes = await userModel.countDocuments({ role: "FEMME MALADE" });
    const totalBenevoles = await userModel.countDocuments({ role: "BENEVOLE" });
    const totalAssociations = await userModel.countDocuments({ role: "ASSOCIATION" });
    const totalDonateurs = await userModel.countDocuments({ role: { $in: ["DONTEUR", "DONATEUR"] } });

    const totalDemandes = await demandeModel.countDocuments();
    const demandesEnAttente = await demandeModel.countDocuments({ statut: "EN_ATTENTE" });
    const demandesValidees = await demandeModel.countDocuments({ statut: "VALIDEE" });
    const demandesRefusees = await demandeModel.countDocuments({ statut: "REFUSEE" });

    const totalDons = await donModel.countDocuments();
    const donsConfirmes = await donModel.countDocuments({ statut: "CONFIRME" });

    const totalLogs = await logModel.countDocuments();

    res.json({
      stats: {
        totalUsers,
        totalFemmes,
        totalBenevoles,
        totalAssociations,
        totalDonateurs,
        totalDemandes,
        demandesEnAttente,
        demandesValidees,
        demandesRefusees,
        totalDons,
        donsConfirmes,
        totalLogs,
      },
    });
  } catch (error) {
    console.error('[ADMIN ERROR]', error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;