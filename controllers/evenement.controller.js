const Evenement = require("../models/evenement.model");

const getAllEvenements = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};

    if (search && search.trim()) {
      filter = {
        $or: [
          { titre: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { lieu: { $regex: search, $options: "i" } },
          { type: { $regex: search, $options: "i" } },
        ],
      };
    }

    const evenements = await Evenement.find(filter).sort({ dateDebut: 1 });
    return res.status(200).json(evenements);
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la récupération des évènements",
      error: error.message,
    });
  }
};

const getEvenementById = async (req, res) => {
  try {
    const evenement = await Evenement.findById(req.params.id);

    if (!evenement) {
      return res.status(404).json({ message: "Évènement introuvable" });
    }

    return res.status(200).json(evenement);
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la récupération de l'évènement",
      error: error.message,
    });
  }
};

const createEvenement = async (req, res) => {
  try {
    const { titre, description, lieu, type, dateDebut, dateFin, rappelActive } =
      req.body;

    if (!titre || !type || !dateDebut || !dateFin) {
      return res.status(400).json({
        message: "titre, type, dateDebut et dateFin sont obligatoires",
      });
    }

    if (new Date(dateFin) < new Date(dateDebut)) {
      return res.status(400).json({
        message: "La date de fin doit être après la date de début",
      });
    }

    const evenement = await Evenement.create({
      titre,
      description,
      lieu,
      type,
      dateDebut,
      dateFin,
      rappelActive,
    });

    return res.status(201).json({
      message: "Évènement créé avec succès",
      data: evenement,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la création de l'évènement",
      error: error.message,
    });
  }
};

const updateEvenement = async (req, res) => {
  try {
    const { id } = req.params;
    const evenement = await Evenement.findById(id);

    if (!evenement) {
      return res.status(404).json({ message: "Évènement introuvable" });
    }

    const {
      titre,
      description,
      lieu,
      type,
      dateDebut,
      dateFin,
      rappelActive,
    } = req.body;

    const newDateDebut = dateDebut || evenement.dateDebut;
    const newDateFin = dateFin || evenement.dateFin;

    if (new Date(newDateFin) < new Date(newDateDebut)) {
      return res.status(400).json({
        message: "La date de fin doit être après la date de début",
      });
    }

    evenement.titre = titre ?? evenement.titre;
    evenement.description = description ?? evenement.description;
    evenement.lieu = lieu ?? evenement.lieu;
    evenement.type = type ?? evenement.type;
    evenement.dateDebut = dateDebut ?? evenement.dateDebut;
    evenement.dateFin = dateFin ?? evenement.dateFin;
    evenement.rappelActive = rappelActive ?? evenement.rappelActive;

    await evenement.save();

    return res.status(200).json({
      message: "Évènement modifié avec succès",
      data: evenement,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la modification de l'évènement",
      error: error.message,
    });
  }
};

const deleteEvenement = async (req, res) => {
  try {
    const evenement = await Evenement.findById(req.params.id);

    if (!evenement) {
      return res.status(404).json({ message: "Évènement introuvable" });
    }

    await Evenement.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Évènement supprimé avec succès",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la suppression de l'évènement",
      error: error.message,
    });
  }
};

const inscrireEvenement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const evenement = await Evenement.findById(id);

    if (!evenement) {
      return res.status(404).json({ message: "Évènement introuvable" });
    }

    const dejaInscrit = evenement.participants?.some(
      (participantId) => participantId.toString() === userId.toString()
    );

    if (dejaInscrit) {
      return res.status(200).json({
        message: "Vous êtes déjà inscrit à cet évènement",
        data: evenement,
      });
    }

    evenement.participants = [...(evenement.participants || []), userId];
    await evenement.save();

    return res.status(200).json({
      message: "Inscription à l'évènement réussie",
      data: evenement,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de l'inscription à l'évènement",
      error: error.message,
    });
  }
};

module.exports = {
  getAllEvenements,
  getEvenementById,
  createEvenement,
  updateEvenement,
  deleteEvenement,
  inscrireEvenement,
};