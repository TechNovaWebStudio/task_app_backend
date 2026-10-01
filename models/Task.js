const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, trim: true, default: 'Personal' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['non_completed', 'completed'],
      default: 'non_completed',
    },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    time: { type: String, default: '' },
    seriesId: { type: String, required: true, index: true },
    reminder: { type: Date },
    estimatedDuration: { type: Number, default: 0 }, // minutes
    actualDuration: { type: Number, default: 0 }, // minutes
    notes: { type: String, default: '' },
    tags: [{ type: String, trim: true }],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    completedAt: { type: Date },
    isArchived: { type: Boolean, default: false },
    assignee: { type: String, default: 'Admin' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for performance
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, category: 1 });
taskSchema.index({ userId: 1, date: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, date: 1, sortOrder: 1 }); // for sorted task list queries
taskSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Task', taskSchema);
