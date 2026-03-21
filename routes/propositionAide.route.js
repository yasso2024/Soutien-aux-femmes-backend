const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createPropositionAide,
  listPropositionsAide,
  getPropositionAide,
  updatePropositionAide,
  deletePropositionAide
} = require('../controllers/propositionAide.controller');

const router = express.Router();

router.post('/', protect, createPropositionAide);
router.get('/', protect, listPropositionsAide);
router.get('/:id', protect, getPropositionAide);
router.put('/:id', protect, updatePropositionAide);
router.delete('/:id', protect, deletePropositionAide);

module.exports = router;