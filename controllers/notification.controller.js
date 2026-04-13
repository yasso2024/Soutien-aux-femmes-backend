const notificationModel = require('../models/notification.model');

async function createNotification(req, res) {
  try {
    const notification = await notificationModel.create(req.body);

    res.status(201).json({
      status: true,
      message: 'Notification créée avec succès',
      notification
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function listNotifications(req, res) {
  try {
    const notifications = await notificationModel.find({
      utilisateur: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({ status: true, notifications });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function markAsRead(req, res) {
  try {
    const notification = await notificationModel.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ status: false, message: 'Notification introuvable' });
    }

    notification.lu = true;
    await notification.save();

    res.status(200).json({
      status: true,
      message: 'Notification marquée comme lue',
      notification
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

async function deleteNotification(req, res) {
  try {
    const notification = await notificationModel.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ status: false, message: 'Notification introuvable' });
    }

    await notificationModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: 'Notification supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  deleteNotification
};