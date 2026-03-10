const Notification = require('../models/notification.model');

async function mesNotifications(req, res) {
    try {
        const { lu } = req.query;
        const filtre = { destinataire: req.user._id };
        if (lu === 'false') filtre.lu = false;
        const notifications = await Notification.find(filtre)
            .populate('expediteur', 'nom avatar')
            .sort({ createdAt: -1 })
            .limit(50);
        const nonLues = await Notification.countDocuments({ destinataire: req.user._id, lu: false });
        res.status(200).json({ status: true, notifications, nonLues });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

// marquerCommeLue() — méthode Notification du diagramme
async function marquerLue(req, res) {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ status: false, message: "Notification non trouvée" });
        if (notification.destinataire.toString() !== req.user._id.toString()) {
            return res.status(403).json({ status: false, message: "Non autorisé" });
        }
        await notification.marquerCommeLue(); // méthode du diagramme
        res.status(200).json({ status: true, message: "Notification lue" });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function marquerToutesLues(req, res) {
    try {
        await Notification.updateMany({ destinataire: req.user._id, lu: false }, { lu: true });
        res.status(200).json({ status: true, message: "Toutes les notifications marquées comme lues" });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { mesNotifications, marquerLue, marquerToutesLues };
