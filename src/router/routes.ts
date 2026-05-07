import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/IndexPage.vue'),
      },
      {
        path: 'login',
        component: () => import('pages/LoginPage.vue'),
      },
      {
        path: 'users',
        component: () => import('pages/UserManagementPage.vue'),
        meta: { requiresAuth: true, roles: ['superadmin', 'admin'] },
      },
      {
        path: 'competition/:competitionId',
        children: [
          {
            path: 'admin',
            component: () => import('pages/AdminPage.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'table-management',
            component: () => import('pages/TableManagementPage.vue'),
          },
          {
            path: 'live-monitoring',
            component: () => import('pages/LiveMonitoringHubPage.vue'),
          },
          {
            path: 'results',
            component: () => import('pages/ResultsPage.vue'),
          },
          {
            path: 'live-scoring',
            component: () => import('pages/LiveScoringPage.vue'),
          },
          {
            path: 'nomination-evaluation',
            component: () => import('pages/NominationEvaluationPage.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'ring-phase-1',
            component: () => import('pages/RingPhase1Page.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'ring-phase-2',
            component: () => import('pages/RingPhase2Page.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'my-overview',
            component: () => import('pages/MyOverviewPage.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'steward-interface',
            component: () => import('pages/StewardInterfacePage.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'live-monitoring-ring',
            component: () => import('pages/LiveMonitoringRingPage.vue'),
          },
          {
            path: 'bis-finals',
            component: () => import('pages/BisFinalsPage.vue'),
            meta: { requiresAuth: true },
          },
        ],
      },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
