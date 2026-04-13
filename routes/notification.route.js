const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createNotification,
  listNotifications,
  markAsRead,
  deleteNotification
} = require('../controllers/notification.controller');

const router = express.Router();

router.post('/', protect, createNotification);
router.get('/', protect, listNotifications);
router.put('/:id/lire', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;