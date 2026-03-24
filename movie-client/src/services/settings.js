import { api, unwrap } from './api';

export async function getPublicSettings() {
  const resp = await api.get('/settings/public');
  return unwrap(resp) || {};
}

