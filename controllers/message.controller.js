const Message      = require('../models/message.model');
const Notification = require('../models/notification.model');
const { saveLog }  = require('../utils/logger');

async function envoyerMessage(req, res) {
    try {
        const { destinataireId, contenu } = req.body;
        if (!destinataireId || !contenu?.trim())
            return res.status(400).json({ status: false, message: 'Destinataire et contenu requis' });

        const msg = await Message.create({
            expediteur:    req.user._id,
            destinataire:  destinataireId,
            contenu:       contenu.trim(),
        });

        await Notification.create({
            message: `Nouveau message de ${req.user.nom}.`,
            destinataire: destinataireId,
            expediteur:   req.user._id,
            type: 'MESSAGE',
            lien: `/app/messages/${req.user._id}`
        });

        const populated = await Message.findById(msg._id)
            .populate('expediteur',   'nom avatar role')
            .populate('destinataire', 'nom avatar role');

        res.status(201).json({ status: true, message: populated });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function obtenirConversation(req, res) {
    try {
        const { userId } = req.params;
        const msgs = await Message.find({
            $or: [
                { expediteur: req.user._id, destinataire: userId },
                { expediteur: userId, destinataire: req.user._id },
            ]
        })
        .populate('expediteur',   'nom avatar role')
        .populate('destinataire', 'nom avatar role')
        .sort({ createdAt: 1 });

        // Marquer comme lus
        await Message.updateMany({ expediteur: userId, destinataire: req.user._id, lu: false }, { lu: true });

        res.status(200).json({ status: true, messages: msgs });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

async function obtenirConversations(req, res) {
    try {
        // Tous les utilisateurs avec qui on a échangé
        const msgs = await Message.find({
            $or: [{ expediteur: req.user._id }, { destinataire: req.user._id }]
        })
        .populate('expediteur',   'nom avatar role')
        .populate('destinataire', 'nom avatar role')
        .sort({ createdAt: -1 });

        const map = new Map();
        for (const m of msgs) {
            const autre = m.expediteur._id.toString() === req.user._id.toString()
                ? m.destinataire : m.expediteur;
            const key = autre._id.toString();
            if (!map.has(key)) {
                map.set(key, { utilisateur: autre, dernierMessage: m, nonLus: 0 });
            }
            if (!m.lu && m.destinataire._id.toString() === req.user._id.toString()) {
                map.get(key).nonLus++;
            }
        }

        res.status(200).json({ status: true, conversations: Array.from(map.values()) });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
}

module.exports = { envoyerMessage, obtenirConversation, obtenirConversations };
