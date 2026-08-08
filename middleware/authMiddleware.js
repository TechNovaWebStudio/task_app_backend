const { verifyToken } = require('../utils/generateToken');
const { errorResponse } = require('../utils/apiResponse');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first, then cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return errorResponse(res, { message: 'Not authenticated. Please login.', statusCode: 401 });
    }

    const decoded = verifyToken(token);
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin || !admin.isActive) {
      return errorResponse(res, { message: 'User not found or deactivated.', statusCode: 401 });
    }

    req.user = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, { message: 'Session expired. Please login again.', statusCode: 401 });
    }
    return errorResponse(res, { message: 'Invalid authentication token.', statusCode: 401 });
  }
};

module.exports = { protect };
