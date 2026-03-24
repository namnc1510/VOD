import { defineStore } from 'pinia';
import * as authApi from '../services/auth';

const TOKEN_KEY = 'movie_token';
const USER_KEY = 'movie_user';

function readStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readStoredUser(),
    loading: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role === 'admin'
  },
  actions: {
    setSession(token, user) {
      this.token = token || '';
      this.user = user || null;

      if (this.token) {
        localStorage.setItem(TOKEN_KEY, this.token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }

      if (this.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    },
    logout() {
      this.setSession('', null);
    },
    async loginWithGoogle(credential) {
      this.loading = true;
      try {
        const data = await authApi.loginWithGoogle(credential);
        this.setSession(data.token, data.user);
        return data;
      } finally {
        this.loading = false;
      }
    },
    async login(payload) {
      this.loading = true;
      try {
        const data = await authApi.login(payload);
        this.setSession(data.token, data.user);
        return data;
      } finally {
        this.loading = false;
      }
    },
    async register(payload) {
      this.loading = true;
      try {
        const data = await authApi.register(payload);
        this.setSession(data.token, data.user);
        return data;
      } finally {
        this.loading = false;
      }
    },
    async refreshMe() {
      if (!this.token) {
        return null;
      }

      try {
        const user = await authApi.me();
        this.setSession(this.token, user);
        return user;
      } catch (error) {
        this.logout();
        throw error;
      }
    }
  }
});

