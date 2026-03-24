const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const HttpError = require('../utils/http-error');
const { escapeRegExp, parsePagination, parseSearch, parseSort } = require('../utils/query');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query, {
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    maxLimit: MAX_LIMIT
  });
  const search = parseSearch(query);
  const role = typeof query?.role === 'string' ? query.role.trim() : '';
  const sort = parseSort(query, {
    field: 'createdAt',
    order: -1,
    allowedFields: ['createdAt', 'name', 'email']
  });

  const filters = {};
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i');
    filters.$or = [{ name: pattern }, { email: pattern }];
  }
  if (role === 'admin') {
    filters.role = { $in: ['admin', 'super', 'editor', 'moderator'] };
  } else if (role === 'user') {
    filters.role = 'user';
  }

  const [items, total] = await Promise.all([
    User.find(filters, { name: 1, email: 1, avatarUrl: 1, plan: 1, watchedCount: 1, role: 1, createdAt: 1 })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filters)
  ]);

  return {
    items,
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

async function createUser(payload) {
  const email = payload.email.toLowerCase();
  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    throw new HttpError(409, 'Email already exists');
  }

  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;
  const role =
    payload.role && ['user', 'admin', 'editor', 'moderator', 'super'].includes(payload.role)
      ? payload.role
      : undefined;

  const user = await User.create({
    name: payload.name,
    email,
    role,
    ...(passwordHash ? { passwordHash } : {})
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || '',
    plan: user.plan,
    watchedCount: user.watchedCount,
    role: user.role,
    createdAt: user.createdAt
  };
}

async function updateUser(id, payload) {
  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.email !== undefined) updateData.email = payload.email.toLowerCase();
  if (payload.plan !== undefined) updateData.plan = payload.plan;
  if (payload.role !== undefined) updateData.role = payload.role;
  if (payload.password !== undefined) {
    updateData.passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;
  }
  
  const user = await User.findByIdAndUpdate(id, updateData, { new: true }).lean();
  if (!user) throw new HttpError(404, 'User not found');
  
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || '',
    plan: user.plan,
    watchedCount: user.watchedCount,
    role: user.role,
    createdAt: user.createdAt
  };
}

async function deleteUser(id) {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new HttpError(404, 'User not found');
  return { success: true };
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
