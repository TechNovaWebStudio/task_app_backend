const express = require('express');
const router = express.Router();
const { login, logout, getMe, register } = require('../controllers/authController');
const { loginValidator, registerValidator } = require('../validators/authValidator');
const { validate } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/register', registerValidator, validate, register);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
