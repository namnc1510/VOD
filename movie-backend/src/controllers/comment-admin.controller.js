const commentService = require('../services/comment.service');
const { successResponse } = require('../utils/api-response');

async function listComments(req, res, next) {
  try {
    const result = await commentService.listComments(req.query);
    return res.status(200).json(successResponse(result.items, result.meta));
  } catch (error) {
    return next(error);
  }
}

async function getCommentStats(req, res, next) {
  try {
    const stats = await commentService.getCommentStats();
    return res.status(200).json(successResponse(stats));
  } catch (error) {
    return next(error);
  }
}

async function updateComment(req, res, next) {
  try {
    const updated = await commentService.updateComment(req.params.id, req.body);
    return res.status(200).json(successResponse(updated));
  } catch (error) {
    return next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    const permanent = String(req.query.permanent || '').toLowerCase() === 'true';
    const result = permanent
      ? await commentService.hardDeleteComment(req.params.id)
      : await commentService.softDeleteComment(req.params.id);
    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listComments,
  getCommentStats,
  updateComment,
  deleteComment
};

