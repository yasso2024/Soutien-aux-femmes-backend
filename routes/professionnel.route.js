const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { lister, creer, modifier, supprimer } = require('../controllers/professionnel.controller');

router.get('/',      protect, lister);
router.post('/',     protect, creer);
router.put('/:id',   protect, modifier);
router.delete('/:id',protect, supprimer);

module.exports = router;
