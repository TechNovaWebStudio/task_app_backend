const { errorResponse } = require('../utils/apiResponse');

const notFound = (req, res) => {
  return errorResponse(res, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
  });
};

module.exports = { notFound };
