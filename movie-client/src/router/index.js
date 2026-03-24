import { createRouter, createWebHistory } from 'vue-router';

const HomeView = () => import('../views/HomeView.vue');
const ExploreView = () => import('../views/ExploreView.vue');
const CategoriesView = () => import('../views/CategoriesView.vue');
const MovieDetailView = () => import('../views/MovieDetailView.vue');
const PlayerView = () => import('../views/PlayerView.vue');
const WatchlistView = () => import('../views/WatchlistView.vue');
const LoginView = () => import('../views/LoginView.vue');
const ProfileView = () => import('../views/ProfileView.vue');
const PricingView = () => import('../views/PricingView.vue');
const NotFoundView = () => import('../views/NotFoundView.vue');
const PersonDetailView = () => import('../views/PersonDetailView.vue'); // New import

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/explore', name: 'explore', component: ExploreView },
    { path: '/categories', name: 'categories', component: CategoriesView },
    {
      path: '/movies/:slug',
      name: 'movie-detail',
      component: () => import('../views/MovieDetailView.vue'),
      props: true
    },
    {
      path: '/person/:slug',
      name: 'person-detail',
      component: () => import('../views/PersonDetailView.vue'),
      props: true
    },
    { path: '/watch/:slug', name: 'player', component: PlayerView, props: true },
    { path: '/watchlist', name: 'watchlist', component: WatchlistView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/profile', name: 'profile', component: ProfileView },
    { path: '/pricing', name: 'pricing', component: PricingView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;

