const { body } = require('express-validator');

const createCategoryValidator = [
  body('name').notEmpty().withMessage('Category name is required').trim().isLength({ max: 50 }).withMessage('Name too long'),
  body('color').optional().isHexColor().withMessage('Invalid color format'),
  body('description').optional().trim().isLength({ max: 300 }).withMessage('Description too long'),
];

const updateCategoryValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 50 }),
  body('color').optional().isHexColor().withMessage('Invalid color format'),
];

module.exports = { createCategoryValidator, updateCategoryValidator };
