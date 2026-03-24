const Comment = require('../models/comment.model');
const Movie = require('../models/movie.model');
const User = require('../models/user.model');
const HttpError = require('../utils/http-error');
const slugify = require('../utils/slug');
const { escapeRegExp, parsePagination, parseSearch, parseSort } = require('../utils/query');

async function resolveMovieBySlug(slug) {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) {
    throw new HttpError(400, 'Invalid movie identifier');
  }

  const movie = await Movie.findOne({ slug: normalizedSlug }, { _id: 1 }).lean();
  if (!movie) {
    throw new HttpError(404, 'Movie not found');
  }

  return movie;
}

async function listCommentsByMovieSlug(slug, query) {
  const movie = await resolveMovieBySlug(slug);
  const { page, limit, skip } = parsePagination(query, {
    page: 1,
    limit: 10,
    maxLimit: 100
  });

  const baseFilters = {
    movie: movie._id,
    deletedAt: null,
    hidden: { $ne: true },
    $or: [{ status: 'approved' }, { status: { $exists: false } }]
  };

  const [items, total] = await Promise.all([
    Comment.find(baseFilters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatarUrl')
      .lean(),
    Comment.countDocuments(baseFilters)
  ]);

  return {
    items: items.map((comment) => ({
      id: comment._id.toString(),
      user: comment.user
        ? {
            id: comment.user._id ? comment.user._id.toString() : comment.user.toString(),
            name: comment.user.name,
            avatarUrl: comment.user.avatarUrl
          }
        : null,
      content: comment.content,
      likesCount: comment.likesCount,
      createdAt: comment.createdAt
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: skip + items.length < total,
      hasPreviousPage: page > 1
    }
  };
}

async function createCommentByMovieSlug(slug, userId, payload) {
  const [movie, user] = await Promise.all([resolveMovieBySlug(slug), User.findById(userId).lean()]);

  if (!user) {
    throw new HttpError(401, 'User not found');
  }

  const comment = await Comment.create({
    movie: movie._id,
    user: user._id,
    content: payload.content,
    status: 'pending',
    hidden: false,
    deletedAt: null,
    likesCount: 0
  });

  return {
    id: comment._id.toString(),
    user: user
      ? {
          id: user._id.toString(),
          name: user.name,
          avatarUrl: user.avatarUrl || ''
        }
      : null,
    content: comment.content,
    likesCount: comment.likesCount,
    createdAt: comment.createdAt
  };
}

async function listComments(query) {
  const { page, limit, skip } = parsePagination(query, {
    page: 1,
    limit: 10,
    maxLimit: 100
  });

  const search = parseSearch(query);
  const sort = parseSort(query, {
    field: 'createdAt',
    order: -1,
    allowedFields: ['createdAt']
  });

  const status = typeof query?.status === 'string' ? query.status.trim() : '';
  const includeDeleted = String(query?.includeDeleted || '').toLowerCase() === 'true';

  const filters = {};
  if (!includeDeleted) {
    filters.deletedAt = null;
  }

  if (status && ['pending', 'approved', 'spam'].includes(status)) {
    if (status === 'approved') {
      filters.$or = [{ status: 'approved' }, { status: { $exists: false } }];
    } else {
      filters.status = status;
    }
  }

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i');
    // Search is best-effort because user/movie are in separate collections.
    // We search content directly here; user/movie will be handled after populate (client-side can also filter).
    filters.content = pattern;
  }

  const [items, total] = await Promise.all([
    Comment.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email avatarUrl')
      .populate('movie', 'title slug')
      .lean(),
    Comment.countDocuments(filters)
  ]);

  return {
    items: items.map((c) => ({
      id: c._id.toString(),
      content: c.content,
      status: c.status || 'approved',
      hidden: Boolean(c.hidden),
      deletedAt: c.deletedAt || null,
      likesCount: c.likesCount,
      createdAt: c.createdAt,
      user: c.user
        ? {
            id: c.user._id ? c.user._id.toString() : c.user.toString(),
            name: c.user.name,
            email: c.user.email,
            avatarUrl: c.user.avatarUrl
          }
        : null,
      movie: c.movie
        ? {
            id: c.movie._id ? c.movie._id.toString() : c.movie.toString(),
            title: c.movie.title,
            slug: c.movie.slug
          }
        : null
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: skip + items.length < total,
      hasPreviousPage: page > 1
    }
  };
}

async function getCommentStats() {
  const base = { deletedAt: null };
  const [total, pending, approved, spam] = await Promise.all([
    Comment.countDocuments(base),
    Comment.countDocuments({ ...base, status: 'pending' }),
    Comment.countDocuments({ ...base, $or: [{ status: 'approved' }, { status: { $exists: false } }] }),
    Comment.countDocuments({ ...base, status: 'spam' })
  ]);

  return { total, pending, approved, spam };
}

async function updateComment(id, payload) {
  const updateData = {};
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.hidden !== undefined) updateData.hidden = payload.hidden;

  const updated = await Comment.findByIdAndUpdate(id, updateData, { new: true })
    .populate('user', 'name email avatarUrl')
    .populate('movie', 'title slug')
    .lean();

  if (!updated) throw new HttpError(404, 'Comment not found');

  return {
    id: updated._id.toString(),
    content: updated.content,
    status: updated.status || 'approved',
    hidden: Boolean(updated.hidden),
    deletedAt: updated.deletedAt || null,
    likesCount: updated.likesCount,
    createdAt: updated.createdAt,
    user: updated.user
      ? {
          id: updated.user._id ? updated.user._id.toString() : updated.user.toString(),
          name: updated.user.name,
          email: updated.user.email,
          avatarUrl: updated.user.avatarUrl
        }
      : null,
    movie: updated.movie
      ? {
          id: updated.movie._id ? updated.movie._id.toString() : updated.movie.toString(),
          title: updated.movie.title,
          slug: updated.movie.slug
        }
      : null
  };
}

async function softDeleteComment(id) {
  const updated = await Comment.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).lean();
  if (!updated) throw new HttpError(404, 'Comment not found');
  return { success: true };
}

async function hardDeleteComment(id) {
  const result = await Comment.deleteOne({ _id: id });
  if (!result || result.deletedCount === 0) throw new HttpError(404, 'Comment not found');
  return { success: true };
}

module.exports = {
  listCommentsByMovieSlug,
  createCommentByMovieSlug,
  listComments,
  getCommentStats,
  updateComment,
  softDeleteComment,
  hardDeleteComment
};
