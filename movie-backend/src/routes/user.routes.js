const express = require('express');
const { createUser, listUsers, updateUser, deleteUser } = require('../controllers/user.controller');
const validateBody = require('../middlewares/validate-body');
const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorize-role');

const router = express.Router();

const createUserSchema = {
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
    required: false,
    type: 'string',
    minLength: 6,
    maxLength: 72
  },
  role: {
    required: false,
    type: 'string',
    enum: ['user', 'admin', 'editor', 'moderator', 'super']
  }
};

const updateUserSchema = {
  name: {
    required: false,
    type: 'string',
    minLength: 2,
    maxLength: 80
  },
  email: {
    required: false,
    type: 'string',
    format: 'email',
    maxLength: 120
  },
  password: {
    required: false,
    type: 'string',
    minLength: 6,
    maxLength: 72
  },
  plan: {
    required: false,
    type: 'string',
    enum: ['free', 'premium']
  },
  role: {
    required: false,
    type: 'string',
    enum: ['user', 'admin', 'editor', 'moderator', 'super']
  }
};

router.get('/info', authenticate, async (req, res, next) => {
  try {
    const { getCurrentUser } = require('../services/auth.service');
    const u = await getCurrentUser(req.auth.userId);
    
    const vbenUser = {
      id: u.id,
      username: u.name,
      realName: u.name,
      avatar: u.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEDzg2MG712tWs_ae3UgVNpmYq0AgG2Q5mP3KG7lZGEILvHfa15ys4VOAw10Rsng2LYeJ-Yo6myr9v2J7IJTdSU12racheZJJXzUXn34F8iqV-bhTpciZo1EUyj3Xh1WBnGu9Ab9HESQXNlhtgiQqIGIBpURUT0rTh4lzoQJaM-Fh_OODTVhNl4scQ5ZYnwaOVdKrPgHjprIApi0bMhVyzGQx_dWnhd8mbcm6O3PnCqar5pMcIWB92-bQSadEQpGzvO72NriUcOby',
      desc: u.email,
      roles: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role || 'user']
    };

    const { successResponse } = require('../utils/api-response');
    return res.status(200).json(successResponse(vbenUser));
  } catch (error) {
    return next(error);
  }
});

router.get('/', authenticate, authorizeRole(['admin', 'super']), listUsers);
router.post('/', authenticate, authorizeRole(['admin', 'super']), validateBody(createUserSchema), createUser);
router.put('/:id', authenticate, authorizeRole(['admin', 'super']), validateBody(updateUserSchema), updateUser);
router.delete('/:id', authenticate, authorizeRole(['admin', 'super']), deleteUser);

module.exports = router;
