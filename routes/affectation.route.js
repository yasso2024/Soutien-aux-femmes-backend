const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createAffectation,
  listAffectations,
  getAffectation,
  updateAffectation,
  deleteAffectation,
  confirmerParticipation,
  changeAffectationStatus
} = require('../controllers/affectation.controller');

const router = express.Router();

router.post('/', protect, createAffectation);
router.get('/', protect, listAffectations);
router.get('/:id', protect, getAffectation);
router.put('/:id', protect, updateAffectation);
router.put('/:id/confirmer', protect, confirmerParticipation);
router.put('/:id/statut', protect, changeAffectationStatus);
router.delete('/:id', protect, deleteAffectation);

module.exports = router;