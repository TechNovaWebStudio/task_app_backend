const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/profileController');
const { changePasswordValidator } = require('../validators/authValidator');
const { validate } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/password', changePasswordValidator, validate, changePassword);

module.exports = router;
