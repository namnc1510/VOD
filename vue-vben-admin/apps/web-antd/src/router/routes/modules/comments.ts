import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:message-square',
      title: 'menu.comments.title',
      order: 30,
      authority: ['super', 'admin', 'moderator'],
    },
    name: 'Comments',
    path: '/comments',
    children: [
      {
        name: 'CommentManagement',
        path: '',
        component: () => import('#/views/comments/index.vue'),
        meta: {
          icon: 'lucide:messages-square',
          title: 'menu.comments.all',
        },
      },
    ],
  },
];

export default routes;
