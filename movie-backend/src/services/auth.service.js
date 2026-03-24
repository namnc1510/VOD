const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const config = require('../config/env');
const User = require('../models/user.model');
const HttpError = require('../utils/http-error');

function rolesForUserRole(role) {
  const r = typeof role === 'string' ? role.trim().toLowerCase() : 'user';
  if (r === 'super') return ['super', 'admin'];
  if (r === 'admin') return ['admin'];
  if (r === 'editor') return ['editor'];
  if (r === 'moderator') return ['moderator'];
  return ['user'];
}

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || '',
    avatar: user.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEDzg2MG712tWs_ae3UgVNpmYq0AgG2Q5mP3KG7lZGEILvHfa15ys4VOAw10Rsng2LYeJ-Yo6myr9v2J7IJTdSU12racheZJJXzUXn34F8iqV-bhTpciZo1EUyj3Xh1WBnGu9Ab9HESQXNlhtgiQqIGIBpURUT0rTh4lzoQJaM-Fh_OODTVhNl4scQ5ZYnwaOVdKrPgHjprIApi0bMhVyzGQx_dWnhd8mbcm6O3PnCqar5pMcIWB92-bQSadEQpGzvO72NriUcOby',
    plan: user.plan || 'free',
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    watchedCount: user.watchedCount || 0,
    role: user.role,
    roles: rolesForUserRole(user.role),
    realName: user.name,
    username: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn
    }
  );
}

async function register(payload) {
  const email = payload.email.toLowerCase();
  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    throw new HttpError(409, 'Email already exists');
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await User.create({
    name: payload.name,
    email,
    avatarUrl: payload.avatarUrl || '',
    plan: payload.plan || 'free',
    passwordHash
  });

  const token = signToken(user);

  return {
    accessToken: token,
    token,
    user: toSafeUser(user)
  };
}

async function login(payload) {
  const email = payload.email.toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = signToken(user);

  return {
    accessToken: token,
    token,
    user: toSafeUser(user)
  };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  return {
    ...toSafeUser(user)
  };
}

async function changePassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new HttpError(404, 'User not found');
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new HttpError(400, 'Mật khẩu cũ không chính xác');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return true;
}

async function updateProfile(userId, payload) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');

  if (payload.name) user.name = payload.name;
  if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;
  
  await user.save();
  return toSafeUser(user);
}

async function deleteAccount(userId) {
  const result = await User.findByIdAndDelete(userId);
  if (!result) throw new HttpError(404, 'User not found');
  return true;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired token');
  }
}

const { OAuth2Client } = require('google-auth-library');
let googleClient = null;

async function loginWithGoogle(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new HttpError(500, 'Server is missing GOOGLE_CLIENT_ID configuration');
  }
  
  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  const { email, name, picture } = payload;
  
  if (!email) {
    throw new HttpError(400, 'Google Account has no email address attached');
  }

  let user = await User.findOne({ email });
  
  if (!user) {
    const randomPassword = require('crypto').randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    user = new User({ 
      email, 
      name: name || 'Google User', 
      avatarUrl: picture, 
      passwordHash, 
      role: 'user',
      status: 'active'
    });
    await user.save();
  } else if (!user.avatarUrl && picture) {
    user.avatarUrl = picture;
    await user.save();
  }
  
  if (user.status !== 'active') {
    throw new HttpError(403, 'Your account is disabled');
  }

  const token = generateToken(user);
  return {
    token,
    user: toSafeUser(user)
  };
}

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword,
  updateProfile,
  deleteAccount,
  verifyToken,
  loginWithGoogle
};
