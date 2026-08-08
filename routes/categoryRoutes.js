const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { createCategoryValidator, updateCategoryValidator } = require('../validators/categoryValidator');
const { validate } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getCategories);
router.post('/', createCategoryValidator, validate, createCategory);
router.put('/:id', updateCategoryValidator, validate, updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
