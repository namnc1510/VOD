import type { RouteRecordRaw } from 'vue-router';

// In vben we can define routes that use the default Layout
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:film',
      title: 'menu.movies.title',
      order: 10,
      authority: ['super', 'admin', 'editor'],
    },
    name: 'Movies',
    path: '/movies',
    children: [
      {
        name: 'MovieList',
        path: '',
        component: () => import('#/views/movies/index.vue'),
        meta: {
          icon: 'lucide:list-video',
          title: 'menu.movies.library',
        },
      },
      {
        name: 'MovieEpisodeList',
        path: 'episodes',
        component: () => import('#/views/episodes/index.vue'),
        meta: {
          icon: 'lucide:play-square',
          title: 'menu.movies.episodes',
        },
      },
      {
        name: 'MovieTaxonomies',
        path: 'taxonomies',
        component: () => import('#/views/taxonomies/index.vue'),
        meta: {
          icon: 'lucide:tags',
          title: 'menu.movies.taxonomies',
        },
      },
      {
        name: 'Persons',
        path: '/persons',
        component: () => import('#/views/persons/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: 'menu.persons.title',
        },
      },
    ],
  },
];

export default routes;
