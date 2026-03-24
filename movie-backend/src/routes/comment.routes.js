const express = require('express');

const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorize-role');
const validateBody = require('../middlewares/validate-body');

const {
  listComments,
  getCommentStats,
  updateComment,
  deleteComment
} = require('../controllers/comment-admin.controller');

const router = express.Router();

const updateCommentSchema = {
  status: {
    required: false,
    type: 'string',
    enum: ['pending', 'approved', 'spam']
  },
  hidden: {
    required: false,
    type: 'boolean'
  }
};

// Admin-only moderation endpoints.
router.get('/', authenticate, authorizeRole(['admin', 'super']), listComments);
router.get('/stats', authenticate, authorizeRole(['admin', 'super']), getCommentStats);
// Use PUT instead of PATCH because the current web client wrapper doesn't expose `.patch()`.
router.put('/:id', authenticate, authorizeRole(['admin', 'super']), validateBody(updateCommentSchema), updateComment);
router.delete('/:id', authenticate, authorizeRole(['admin', 'super']), deleteComment);

module.exports = router;
