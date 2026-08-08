const { errorResponse } = require('../utils/apiResponse');

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    return next();
  }
  return errorResponse(res, { message: 'Access denied. Admin only.', statusCode: 403 });
};

module.exports = { adminOnly };
