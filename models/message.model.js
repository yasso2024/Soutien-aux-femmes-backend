const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    expediteur: { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs', required: true },
    destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs', required: true },
    contenu: { type: String, required: true, trim: true },
    lu: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('messages', messageSchema);
