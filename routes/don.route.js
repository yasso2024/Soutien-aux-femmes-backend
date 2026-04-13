const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createDon,
  listDons,
  getDon,
  updateDon,
  confirmDon,
  changeDonStatus,
  deleteDon
} = require('../controllers/don.controller');

const router = express.Router();

router.post('/', protect, createDon);
router.get('/', protect, listDons);
router.get('/:id', protect, getDon);
router.put('/:id', protect, updateDon);
router.put('/:id/confirm', protect, confirmDon);
router.put('/:id/statut', protect, changeDonStatus);
router.delete('/:id', protect, deleteDon);

module.exports = router;