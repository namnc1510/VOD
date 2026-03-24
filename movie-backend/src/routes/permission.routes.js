const express = require('express');

const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorize-role');
const validateBody = require('../middlewares/validate-body');

const { listRoles, getRole, updateRole, listCodes } = require('../controllers/role-permission.controller');

const router = express.Router();

const updateRoleSchema = {
  codes: {
    required: true,
    type: 'array',
    elementType: 'string',
    maxItems: 500
  }
};

// Admin-only permissions management.
router.get('/codes', authenticate, authorizeRole(['admin', 'super']), listCodes);
router.get('/roles', authenticate, authorizeRole(['admin', 'super']), listRoles);
router.get('/roles/:role', authenticate, authorizeRole(['admin', 'super']), getRole);
router.put(
  '/roles/:role',
  authenticate,
  authorizeRole(['admin', 'super']),
  validateBody(updateRoleSchema),
  updateRole
);

module.exports = router;
