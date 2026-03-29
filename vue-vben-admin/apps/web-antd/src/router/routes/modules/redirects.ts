import type { RouteRecordRaw } from 'vue-router';

// Compatibility redirects for older defaultHomePath / bookmarks.
const routes: RouteRecordRaw[] = [
  {
    name: 'RedirectAnalytics',
    path: '/analytics',
    redirect: '/statistics',
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      title: 'Redirect',
    },
  },
  {
    name: 'RedirectDashboard',
    path: '/dashboard',
    redirect: '/statistics',
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      title: 'Redirect',
    },
  },
  {
    name: 'RedirectEpisodes',
    path: '/episodes',
    redirect: '/movies/episodes',
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      title: 'Redirect',
    },
  },
  {
    name: 'RedirectTaxonomies',
    path: '/taxonomies',
    redirect: '/movies/taxonomies',
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      title: 'Redirect',
    },
  },
];

export default routes;
