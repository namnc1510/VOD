import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:credit-card',
      title: 'menu.transactions.title',
      order: 15,
      authority: ['super', 'admin'],
    },
    name: 'TransactionsManagement',
    path: '/transactions',
    children: [
      {
        name: 'TransactionsDashboard',
        path: 'dashboard',
        component: () => import('#/views/transactions/dashboard.vue'),
        meta: {
          icon: 'lucide:pie-chart',
          title: 'Dashboard',
        },
      },
      {
        name: 'TransactionList',
        path: 'list',
        component: () => import('#/views/transactions/index.vue'),
        meta: {
          icon: 'lucide:receipt',
          title: 'Transactions List',
        },
      },
    ],
  },
];

export default routes;
