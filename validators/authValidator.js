const { body } = require('express-validator');

const loginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').trim(),
];

const registerValidator = [
  body('name').notEmpty().withMessage('Name is required').trim().isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

module.exports = { loginValidator, registerValidator, changePasswordValidator };
