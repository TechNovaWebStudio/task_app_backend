const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

const createNotification = async ({ userId, title, message, type = 'system', taskId = null }) => {
  try {
    const notification = await Notification.create({ userId, title, message, type, taskId });
    return notification;
  } catch (error) {
    // Non-blocking — log but don't throw
    console.error('Failed to create notification:', error.message);
  }
};

const logActivity = async ({ userId, action, description, taskId = null, req = null }) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      description,
      taskId,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress || '') : '',
      userAgent: req ? (req.headers['user-agent'] || '') : '',
    });
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};

module.exports = { createNotification, logActivity };
