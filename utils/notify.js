const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');
const { sendPushNotification } = require('./oneSignal');

/**
 * Saves a notification in the DB and sends a OneSignal push to the user.
 * Always resolves — never throws — so callers don't need try/catch around it.
 *
 * @param {string} userId    - Mongoose ObjectId of the recipient user.
 * @param {string} message   - Notification message.
 * @param {string} [type]    - Notification type key (see notification.model.js).
 * @param {string} [lien]    - Optional front-end route link.
 * @param {string} [heading] - Optional push notification heading.
 */
async function notifyUser(userId, message, type = 'info', lien = null, heading = 'SERVICE INFORMATION MEDICALE') {
  try {
    await notificationModel.create({ utilisateur: userId, message, type, lien });

    const user = await userModel.findById(userId).select('oneSignalPlayerId');
    if (user?.oneSignalPlayerId) {
      await sendPushNotification([user.oneSignalPlayerId], heading, message);
    }
  } catch (err) {
    console.error('notifyUser error:', err.message);
  }
}

/**
 * Notify all users matching a role filter.
 * @param {string|string[]} roles - Role(s) to target.
 * @param {string} message
 * @param {string} [type]
 * @param {string} [lien]
 */
async function notifyRole(roles, message, type = 'info', lien = null) {
  try {
    const roleList = Array.isArray(roles) ? roles : [roles];
    const users = await userModel.find({ role: { $in: roleList } }).select('_id oneSignalPlayerId');
    const playerIds = [];
    const docs = users.map((u) => {
      if (u.oneSignalPlayerId) playerIds.push(u.oneSignalPlayerId);
      return { utilisateur: u._id, message, type, lien };
    });
    if (docs.length) await notificationModel.insertMany(docs);
    if (playerIds.length) {
      await sendPushNotification(playerIds, 'SERVICE INFORMATION MEDICALE', message);
    }
  } catch (err) {
    console.error('notifyRole error:', err.message);
  }
}

module.exports = { notifyUser, notifyRole };
