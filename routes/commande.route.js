const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { passerCommande, payerCommande, mesCommandes, toutesCommandes } = require('../controllers/commande.controller');

router.post('/',            protect, passerCommande);
router.get('/mes-commandes',protect, mesCommandes);
router.get('/',             protect, toutesCommandes);
router.patch('/:id/payer',  protect, payerCommande);

module.exports = router;
