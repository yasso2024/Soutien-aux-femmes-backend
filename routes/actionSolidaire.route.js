const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createActionSolidaire,
  listActionsSolidaires,
  getActionSolidaire,
  updateActionSolidaire,
  deleteActionSolidaire,
  participerAction,
  quitterAction,
  refuserAction,
  changeActionStatus,
  inviterBenevole,
} = require('../controllers/actionSolidaire.controller');

const router = express.Router();

router.post('/', protect, createActionSolidaire);
router.get('/', protect, listActionsSolidaires);
router.get('/:id', protect, getActionSolidaire);
router.put('/:id/statut', protect, changeActionStatus);
router.put('/:id/participer', protect, participerAction);
router.put('/:id/quitter', protect, quitterAction);
router.put('/:id/refuser', protect, refuserAction);
router.put('/:id/inviter/:benevoleId', protect, inviterBenevole);
router.put('/:id', protect, updateActionSolidaire);
router.delete('/:id', protect, deleteActionSolidaire);

module.exports = router;