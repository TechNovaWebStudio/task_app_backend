const Settings = require('../models/Settings');
const { successResponse } = require('../utils/apiResponse');
const { logActivity } = require('../services/notificationService');

// GET /api/settings
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await Settings.create({ userId: req.user._id });
    }
    return successResponse(res, { data: settings });
  } catch (error) {
    next(error);
  }
};

// PUT /api/settings
const updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body },
      { new: true, upsert: true, runValidators: true }
    );
    await logActivity({ userId: req.user._id, action: 'SETTINGS_UPDATED', description: 'Settings updated', req });
    return successResponse(res, { message: 'Settings updated', data: settings });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };
