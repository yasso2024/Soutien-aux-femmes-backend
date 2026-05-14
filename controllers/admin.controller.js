const userModel = require("../models/user.model");
const demandeModel = require("../models/demande.model");
const donModel = require("../models/don.model");
const logModel = require("../models/log.model");

async function getDashboardStats(req, res) {
  try {
    const [
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
      totalLogs
    ] = await Promise.all([
      userModel.countDocuments(),
      userModel.countDocuments({ role: "FEMME MALADE" }),
      userModel.countDocuments({ role: "BENEVOLE" }),
      userModel.countDocuments({ role: "ASSOCIATION" }),
      userModel.countDocuments({ role: { $in: ["DONTEUR", "DONATEUR"] } }),
      demandeModel.countDocuments(),
      demandeModel.countDocuments({ statut: "EN_ATTENTE" }),
      demandeModel.countDocuments({ statut: "VALIDEE" }),
      demandeModel.countDocuments({ statut: "REFUSEE" }),
      donModel.countDocuments(),
      donModel.countDocuments({ statut: "CONFIRME" }),
      logModel.countDocuments()
    ]);

    return res.status(200).json({
      status: true,
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
        totalLogs
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
}

module.exports = { getDashboardStats };