const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { effectuerDon, mesDons, listerDons } = require('../controllers/don.controller');

router.post('/',        protect, effectuerDon);
router.get('/mes-dons', protect, mesDons);
router.get('/',         protect, listerDons);

module.exports = router;
