import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:users',
      title: 'menu.users.title',
      order: 20,
    },
    name: 'Users',
    path: '/users',
    children: [
      {
        name: 'AdminUsers',
        path: 'admin',
        component: () => import('#/views/users/admin.vue'),
        meta: {
          icon: 'lucide:shield-ban',
          title: 'menu.users.admin',
          authority: ['super'],
        },
      },
      {
        name: 'ClientUsers',
        path: 'client',
        component: () => import('#/views/users/client.vue'),
        meta: {
          icon: 'lucide:user-square',
          title: 'menu.users.client',
          authority: ['super', 'admin'],
        },
      },
      {
        name: 'Permissions',
        path: 'permissions',
        component: () => import('#/views/permissions/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: 'menu.users.permissions',
        },
      },
    ],
  },
];

export default routes;
