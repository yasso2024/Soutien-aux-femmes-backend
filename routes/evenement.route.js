const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
    creerEvenement,
    listerEvenements,
    obtenirEvenement,
    modifierEvenement,
    supprimerEvenement
} = require('../controllers/evenement.controller');

router.get('/',      protect, listerEvenements);
router.post('/',     protect, creerEvenement);
router.get('/:id',   protect, obtenirEvenement);
router.put('/:id',   protect, modifierEvenement);
router.delete('/:id',protect, supprimerEvenement);

module.exports = router;
