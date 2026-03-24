import { api, unwrap } from './api';

export async function getWatchlist() {
  const response = await api.get('/watchlist');
  return {
    items: unwrap(response) || [],
    meta: response?.data?.meta || null
  };
}

export async function upsertWatchlist(payload) {
  const response = await api.post('/watchlist', payload);
  return unwrap(response);
}

export async function removeWatchlist(movieId) {
  const response = await api.delete(`/watchlist/${movieId}`);
  return unwrap(response);
}

