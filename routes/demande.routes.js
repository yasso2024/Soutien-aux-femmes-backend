const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createDemande,
  listDemandes,
  getDemande,
  updateDemande,
  deleteDemande,
  changeDemandeStatus
} = require('../controllers/demande.controller');

const router = express.Router();

router.post('/', protect, createDemande);
router.get('/', protect, listDemandes);
router.get('/:id', protect, getDemande);
router.put('/:id', protect, updateDemande);
router.delete('/:id', protect, deleteDemande);

module.exports = router;