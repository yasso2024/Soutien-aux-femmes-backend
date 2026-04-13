const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createActionSolidaire,
  listActionsSolidaires,
  getActionSolidaire,
  updateActionSolidaire,
  deleteActionSolidaire,
  participerAction
} = require('../controllers/actionSolidaire.controller');

const router = express.Router();

router.post('/', protect, createActionSolidaire);
router.get('/', protect, listActionsSolidaires);
router.get('/:id', protect, getActionSolidaire);
router.put('/:id', protect, updateActionSolidaire);
router.put('/:id/participer', protect, participerAction);
router.delete('/:id', protect, deleteActionSolidaire);

module.exports = router;