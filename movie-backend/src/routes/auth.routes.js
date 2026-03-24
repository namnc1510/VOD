const express = require('express');

const { login, me, register, changePassword, updateProfile, deleteAccount, googleLogin } = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');
const validateBody = require('../middlewares/validate-body');

const router = express.Router();

const registerSchema = {
  name: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 80
  },
  email: {
    required: true,
    type: 'string',
    format: 'email',
    maxLength: 120
  },
  password: {
    required: true,
    type: 'string',
    minLength: 6,
    maxLength: 72
  },
  avatarUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  }
};

const loginSchema = {
  email: {
    required: true,
    type: 'string',
    format: 'email',
    maxLength: 120
  },
  password: {
    required: true,
    type: 'string',
    minLength: 6,
    maxLength: 72
  }
};

const changePasswordSchema = {
  oldPassword: { required: true, type: 'string', minLength: 6, maxLength: 72 },
  newPassword: { required: true, type: 'string', minLength: 6, maxLength: 72 }
};

const updateProfileSchema = {
  name: { required: false, type: 'string', minLength: 2, maxLength: 80 },
  avatarUrl: { required: false, type: 'string', maxLength: 500 }
};

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/google', googleLogin);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, validateBody(updateProfileSchema), updateProfile);
router.delete('/account', authenticate, deleteAccount);
router.put('/password', authenticate, validateBody(changePasswordSchema), changePassword);

// Vben specific routes
const { refresh, logout, codes } = require('../controllers/auth.controller');
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/codes', authenticate, codes);

module.exports = router;
