import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:bar-chart',
      title: 'menu.statistics.title',
      order: 25,
      authority: ['super', 'admin'],
    },
    name: 'Statistics',
    path: '/statistics',
    children: [
      {
        name: 'StatisticsDashboard',
        path: '',
        component: () => import('#/views/statistics/index.vue'),
        meta: {
          icon: 'lucide:pie-chart',
          title: 'menu.statistics.overview',
        },
      },
    ],
  },
];

export default routes;
