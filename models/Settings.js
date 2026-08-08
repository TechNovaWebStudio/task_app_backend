const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    theme: { type: String, default: 'light', enum: ['light', 'dark'] },
    timezone: { type: String, default: 'UTC' },
    notificationsEnabled: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: false },
    taskReminders: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: '12h', enum: ['12h', '24h'] },
    defaultPriority: { type: String, default: 'medium', enum: ['low', 'medium', 'high'] },
    defaultView: { type: String, default: 'table', enum: ['table', 'card', 'list'] },
    tasksPerPage: { type: Number, default: 10 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
