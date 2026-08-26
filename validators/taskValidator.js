const { body } = require('express-validator');

const createTaskValidator = [
  body('title').notEmpty().withMessage('Task title is required').trim().isLength({ max: 200 }).withMessage('Title too long'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority value'),
  body('status').optional().isIn(['non_completed', 'completed']).withMessage('Invalid status value'),
  body('dates').optional().isArray().withMessage('Dates must be an array'),
  body('dates.*.date').optional().isISO8601().withMessage('Invalid date format'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('estimatedDuration').optional().isNumeric().withMessage('Estimated duration must be a number'),
];

const updateTaskValidator = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }).withMessage('Title too long'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority value'),
  body('status').optional().isIn(['non_completed', 'completed']).withMessage('Invalid status value'),
  body('dates').optional().isArray().withMessage('Dates must be an array'),
  body('dates.*.date').optional().isISO8601().withMessage('Invalid date format'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
];

module.exports = { createTaskValidator, updateTaskValidator };

