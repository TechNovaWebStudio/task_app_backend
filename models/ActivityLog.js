const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'TASK_CREATED',
        'TASK_UPDATED',
        'TASK_DELETED',
        'TASK_COMPLETED',
        'TASK_RESTORED',
        'TASK_ARCHIVED',
        'CATEGORY_CREATED',
        'CATEGORY_UPDATED',
        'CATEGORY_DELETED',
        'PROFILE_UPDATED',
        'PASSWORD_CHANGED',
        'SETTINGS_UPDATED',
        'BULK_DELETE',
        'BULK_COMPLETE',
      ],
    },
    description: { type: String, required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
