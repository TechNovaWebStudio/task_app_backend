/**
 * Standardised API response helpers
 */

const successResponse = (res, { message = 'Success', data = null, statusCode = 200, meta = null } = {}) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

const errorResponse = (res, { message = 'Something went wrong', errors = [], statusCode = 500 } = {}) => {
  return res.status(statusCode).json({ success: false, message, errors });
};

module.exports = { successResponse, errorResponse };
