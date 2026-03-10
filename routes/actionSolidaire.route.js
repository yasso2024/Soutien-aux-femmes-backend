const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const ActionSolidaire = require('../models/actionSolidaire.model');
const { saveLog } = require('../utils/logger');
const { actionSolidaireSchema } = require('../schemas/actionSolidaire.schema');

// List all actions
router.get('/', protect, async (req, res) => {
    try {
        const actions = await ActionSolidaire.find()
            .populate('association', 'nom email role')
            .sort({ dateAction: 1 });
        res.json({ status: true, actions });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// Get one action
router.get('/:id', protect, async (req, res) => {
    try {
        const action = await ActionSolidaire.findById(req.params.id)
            .populate('association', 'nom email role');
        if (!action) return res.status(404).json({ status: false, message: 'Action non trouvée' });
        res.json({ status: true, action });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// Create action
router.post('/', protect, async (req, res) => {
    try {
        const validation = actionSolidaireSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json({ errors: validation.error.flatten() });
        const action = await ActionSolidaire.create({ ...req.body, association: req.user._id });
        await saveLog({ action: `${req.user.firstName} a créé l'action "${action.titre}"`, actorId: req.user._id });
        res.status(201).json({ status: true, action });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// Update action
router.put('/:id', protect, async (req, res) => {
    try {
        const action = await ActionSolidaire.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!action) return res.status(404).json({ status: false, message: 'Action non trouvée' });
        res.json({ status: true, action });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// Delete action
router.delete('/:id', protect, async (req, res) => {
    try {
        await ActionSolidaire.findByIdAndDelete(req.params.id);
        res.status(204).json();
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// Inscrire bénévole to action
router.post('/:id/inscrire', protect, async (req, res) => {
    try {
        const action = await ActionSolidaire.findById(req.params.id);
        if (!action) return res.status(404).json({ status: false, message: 'Action non trouvée' });
        const affectation = await action.inscrireBenevole(req.user._id);
        res.status(201).json({ status: true, affectation });
    } catch (e) { res.status(400).json({ status: false, message: e.message }); }
});

module.exports = router;
