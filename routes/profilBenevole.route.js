const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  getMyProfil,
  upsertMyProfil,
  listProfils,
  getProfilById,
} = require('../controllers/profilBenevole.controller');

const router = express.Router();

// Bénévole routes
router.get('/me', protect, getMyProfil);
router.put('/me', protect, upsertMyProfil);

// Association / Admin routes
router.get('/', protect, listProfils);
router.get('/:benevoleId', protect, getProfilById);

module.exports = router;
