const Admin = require('../models/Admin');
const Settings = require('../models/Settings');
const { generateToken } = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logActivity } = require('../services/notificationService');
const { NODE_ENV } = require('../config/environment');

const setCookieOptions = () => ({
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !admin.isActive) {
      return errorResponse(res, { message: 'Invalid email or password', statusCode: 401 });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, { message: 'Invalid email or password', statusCode: 401 });
    }

    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = generateToken({ id: admin._id, role: admin.role });

    // Set HTTP-only cookie
    res.cookie('token', token, setCookieOptions());

    await logActivity({
      userId: admin._id,
      action: 'LOGIN',
      description: `Admin ${admin.email} logged in`,
      req,
    });

    return successResponse(res, {
      message: 'Login successful',
      data: { token, admin: admin.toSafeJSON() },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    await logActivity({
      userId: req.user._id,
      action: 'LOGOUT',
      description: `Admin ${req.user.email} logged out`,
      req,
    });

    res.clearCookie('token');
    return successResponse(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user._id);
    const settings = await Settings.findOne({ userId: req.user._id });
    return successResponse(res, { data: { admin, settings } });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register (protected — superadmin only, or first-run)
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await Admin.findOne({ email });
    if (exists) {
      return errorResponse(res, { message: 'Email already registered', statusCode: 409 });
    }

    const admin = await Admin.create({ name, email, password });

    // Create default settings
    await Settings.create({ userId: admin._id });

    const token = generateToken({ id: admin._id, role: admin.role });
    res.cookie('token', token, setCookieOptions());

    return successResponse(res, {
      message: 'Admin account created',
      data: { token, admin: admin.toSafeJSON() },
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, logout, getMe, register };
