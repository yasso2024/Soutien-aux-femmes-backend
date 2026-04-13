const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');
const { sendPushNotification } = require('./oneSignal');

/**
 * Saves a notification in the DB and sends a OneSignal push to the user.
 * Always resolves — never throws — so callers don't need try/catch around it.
 *
 * @param {string} userId   - Mongoose ObjectId of the recipient user.
 * @param {string} message  - Notification message.
 * @param {string} [heading] - Optional push notification heading (defaults to app name).
 */
async function notifyUser(userId, message, heading = 'SERVICE INFORMATION MEDICALE') {
  try {
    // 1. Persist in DB
    await notificationModel.create({ utilisateur: userId, message });

    // 2. Send push if the user has a stored player ID
    const user = await userModel.findById(userId).select('oneSignalPlayerId');
    if (user?.oneSignalPlayerId) {
      await sendPushNotification([user.oneSignalPlayerId], heading, message);
    }
  } catch (err) {
    console.error('notifyUser error:', err.message);
  }
}

module.exports = { notifyUser };
