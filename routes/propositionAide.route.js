const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
    proposerAide,
    propositionsParDemande,
    mesPropositions,
    propositionsRecues,
    accepterProposition,
    refuserProposition
} = require('../controllers/propositionAide.controller');

router.post('/',                 protect, proposerAide);
router.get('/mes-propositions',  protect, mesPropositions);
router.get('/recues',            protect, propositionsRecues);
router.get('/demande/:demandeId', protect, propositionsParDemande);
router.patch('/:id/accepter',    protect, accepterProposition);
router.patch('/:id/refuser',     protect, refuserProposition);

module.exports = router;