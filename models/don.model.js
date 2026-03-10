const mongoose = require('mongoose');

// =========== Don selon diagramme ===========
// Attributs : id, montant:double, dateDon:Date, type:TypeDon
// Enum TypeDon : FINANCIER, MATERIEL
// Relations : 1 Donateur effectue 0..* Don
//             0..1 Don finance 1 DemandeAide

const donSchema = new mongoose.Schema({
    montant: {
        type: Number,
        required: [true, 'Le montant est requis'],
        min: [1, 'Le montant doit être positif']
    },
    dateDon: {
        type: Date,
        default: Date.now
    },
    // Enum TypeDon du diagramme
    type: {
        type: String,
        enum: ['FINANCIER', 'MATERIEL'],
        default: 'FINANCIER'
    },
    // Relation : Donateur effectue Don
    donateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'utilisateurs',
        required: true
    },
    // Relation : Don finance DemandeAide (0..1)
    demandeAide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'demandesAide',
        default: null
    },
    description: { type: String, default: null },
    statut: {
        type: String,
        enum: ['EN_ATTENTE', 'CONFIRME', 'ANNULE'],
        default: 'EN_ATTENTE'
    }
}, { timestamps: true });

// Méthode confirmerDon du diagramme
donSchema.methods.confirmerDon = async function () {
    this.statut = 'CONFIRME';
    if (this.demandeAide && this.type === 'FINANCIER') {
        const DemandeAide = require('./demandeAide.model');
        await DemandeAide.findByIdAndUpdate(this.demandeAide, {
            $inc: { montantCollecte: this.montant }
        });
    }
    return this.save();
};

const Don = mongoose.model('dons', donSchema);
module.exports = Don;
