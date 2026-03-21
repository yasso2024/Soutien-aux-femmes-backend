const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  dateEnvoi: {
    type: Date,
    default: Date.now
  },
  lu: {
    type: Boolean,
    default: false
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  }
}, { timestamps: true });

const notificationModel = mongoose.model('notifications', notificationSchema);
module.exports = notificationModel;