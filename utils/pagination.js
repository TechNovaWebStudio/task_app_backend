/**
 * Build a pagination meta object and the mongoose skip/limit values.
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return { total, page, limit, totalPages };
};

module.exports = { getPagination, buildMeta };
