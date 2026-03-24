import { api, unwrap } from './api';

export async function loginWithGoogle(credential) {
  const response = await api.post('/auth/google', { credential });
  return unwrap(response);
}

export async function login(payload) {
  const response = await api.post('/auth/login', payload);
  return unwrap(response);
}

export async function register(payload) {
  const response = await api.post('/auth/register', payload);
  return unwrap(response);
}

export async function me() {
  const response = await api.get('/auth/me');
  return unwrap(response);
}

export async function changePassword(payload) {
  const response = await api.put('/auth/password', payload);
  return unwrap(response);
}

export async function updateProfile(payload) {
  const response = await api.put('/auth/profile', payload);
  return unwrap(response);
}

export async function deleteAccount() {
  const response = await api.delete('/auth/account');
  return unwrap(response);
}

