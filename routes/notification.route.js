const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notification.controller');

const router = express.Router();

router.post('/', protect, createNotification);
router.get('/', protect, listNotifications);
router.put('/lire-tout', protect, markAllAsRead);
router.put('/:id/lire', protect, markAsRead);
router.delete('/', protect, deleteAllNotifications);
router.delete('/:id', protect, deleteNotification);

module.exports = router;