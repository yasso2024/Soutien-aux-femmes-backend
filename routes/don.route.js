const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createDon,
  listDons,
  getDon,
  updateDon,
  confirmDon,
  changeDonStatus,
  deleteDon,
  getDonatorStats,
  getDonatorPropositions,
} = require('../controllers/don.controller');

const router = express.Router();

router.get('/my-stats', protect, getDonatorStats);
router.get('/my-propositions', protect, getDonatorPropositions);
router.post('/', protect, createDon);
router.get('/', protect, listDons);
router.get('/:id', protect, getDon);
router.put('/:id', protect, updateDon);
router.put('/:id/confirm', protect, confirmDon);
router.put('/:id/statut', protect, changeDonStatus);
router.delete('/:id', protect, deleteDon);

module.exports = router;