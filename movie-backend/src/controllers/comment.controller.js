const commentService = require('../services/comment.service');
const { successResponse } = require('../utils/api-response');

async function listMovieComments(req, res, next) {
  try {
    const result = await commentService.listCommentsByMovieSlug(req.params.slug, req.query);
    return res.status(200).json(successResponse(result.items, result.meta));
  } catch (error) {
    return next(error);
  }
}

async function createMovieComment(req, res, next) {
  try {
    const comment = await commentService.createCommentByMovieSlug(req.params.slug, req.auth.userId, req.body);
    return res.status(201).json(successResponse(comment));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMovieComments,
  createMovieComment
};
