const Category = require('../models/Category');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logActivity } = require('../services/notificationService');

// GET /api/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    return successResponse(res, { data: categories });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    await logActivity({ userId: req.user._id, action: 'CATEGORY_CREATED', description: `Created category: ${category.name}`, req });
    return successResponse(res, { message: 'Category created', data: category, statusCode: 201 });
  } catch (error) {
    next(error);
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return errorResponse(res, { message: 'Category not found', statusCode: 404 });
    await logActivity({ userId: req.user._id, action: 'CATEGORY_UPDATED', description: `Updated category: ${category.name}`, req });
    return successResponse(res, { message: 'Category updated', data: category });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return errorResponse(res, { message: 'Category not found', statusCode: 404 });
    if (category.isDefault) return errorResponse(res, { message: 'Cannot delete default category', statusCode: 400 });
    await Category.findByIdAndDelete(req.params.id);
    await logActivity({ userId: req.user._id, action: 'CATEGORY_DELETED', description: `Deleted category: ${category.name}`, req });
    return successResponse(res, { message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
