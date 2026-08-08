const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 50 },
    color: { type: String, default: '#7C3AED' },
    icon: { type: String, default: 'tag' },
    description: { type: String, default: '', maxlength: 300 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
