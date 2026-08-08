const Admin = require('../models/Admin');
const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logActivity } = require('../services/notificationService');
const bcrypt = require('bcryptjs');
const { BCRYPT_SALT_ROUNDS } = require('../config/environment');

// GET /api/profile
const getProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user._id);
    const [totalTasks, completedTasks, pendingTasks] = await Promise.all([
      Task.countDocuments({ userId: req.user._id }),
      Task.countDocuments({ userId: req.user._id, status: 'completed' }),
      Task.countDocuments({ userId: req.user._id, status: 'pending' }),
    ]);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return successResponse(res, {
      data: { admin, stats: { totalTasks, completedTasks, pendingTasks, completionRate } },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.user._id,
      { name, email, avatar },
      { new: true, runValidators: true }
    );
    await logActivity({ userId: req.user._id, action: 'PROFILE_UPDATED', description: 'Profile information updated', req });
    return successResponse(res, { message: 'Profile updated successfully', data: admin });
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.user._id).select('+password');

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) return errorResponse(res, { message: 'Current password is incorrect', statusCode: 400 });

    admin.password = newPassword;
    await admin.save();

    await logActivity({ userId: req.user._id, action: 'PASSWORD_CHANGED', description: 'Password changed', req });
    return successResponse(res, { message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword };
