import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      title: 'menu.system.title',
      order: 90,
      authority: ['super', 'admin'],
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'Settings',
        path: 'settings',
        component: () => import('#/views/settings/index.vue'),
        meta: {
          icon: 'lucide:sliders-horizontal',
          title: 'menu.system.settings',
        },
      },
      {
        name: 'PricingSettings',
        path: 'pricing',
        component: () => import('#/views/settings/pricing/index.vue'),
        meta: {
          icon: 'lucide:circle-dollar-sign',
          title: 'Pricing Settings',
        },
      },
      {
        name: 'SystemHomeHero',
        path: 'hero-slider',
        component: () => import('#/views/home-hero/index.vue'),
        meta: {
          icon: 'lucide:layout-template',
          title: 'menu.system.heroSlider',
        },
      },
    ],
  },
];

export default routes;
