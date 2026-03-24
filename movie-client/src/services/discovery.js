import { api, unwrap } from './api';

export async function getHomeFeed() {
  const response = await api.get('/discovery/home');
  return unwrap(response);
}

export async function getCatalogFilters() {
  const response = await api.get('/discovery/filters');
  return unwrap(response);
}

export async function getCountriesCatalog() {
  const response = await api.get('/discovery/countries');
  return unwrap(response);
}

export async function getMovieLanding(slug) {
  const response = await api.get(`/discovery/movies/${slug}`);
  return unwrap(response);
}

export async function getMovieEpisodes(slug, params = {}) {
  const response = await api.get(`/movies/${slug}/episodes`, { params });
  return {
    items: unwrap(response) || [],
    meta: response?.data?.meta || null,
  };
}

export async function getMovies(params = {}) {
  const response = await api.get('/movies', { params });
  return {
    items: unwrap(response) || [],
    meta: response?.data?.meta || response?.data?.data?.meta || null
  };
}

export async function getMovieComments(slug, params = {}) {
  const response = await api.get(`/movies/${slug}/comments`, { params });
  return {
    items: unwrap(response) || [],
    meta: response?.data?.meta || response?.data?.data?.meta || null
  };
}

export async function postMovieComment(slug, payload) {
  const response = await api.post(`/movies/${slug}/comments`, payload);
  return unwrap(response);
}

export async function getPersons(params = {}) {
  const response = await api.get('/persons', { params });
  return {
    items: unwrap(response) || [],
    meta: response?.data?.meta || response?.data?.data?.meta || null
  };
}

export async function getPersonBySlug(slug) {
  const response = await api.get(`/persons/${slug}`);
  return unwrap(response);
}

