const mongoose = require('mongoose');

const quizResultatSchema = new mongoose.Schema({
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateurs', default: null },
    reponses:    [{ question: String, reponse: String }],
    scoreRisque: { type: String, enum: ['FAIBLE', 'MODERE', 'ELEVE'], default: 'FAIBLE' },
    recommandation: { type: String, default: '' },
    ip:          { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('quizResultats', quizResultatSchema);
