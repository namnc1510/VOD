import { api, unwrap } from './api';

export async function getDashboardOverview() {
  const response = await api.get('/dashboard/overview');
  return unwrap(response);
}

