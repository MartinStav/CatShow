import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from 'src/stores/auth';

export default defineRouter(function ({ store }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore(store);

    if (authStore.token && !authStore.user) {
      await authStore.fetchMe();
    }

    // Úvod (Vitajte) ako vstup: priamom otvorení URL /login zobraz domovskú stránku (Prihlásenie ostáva v hornom paneli).
    // Chránená trasa ktorá vyžaduje účet rieši guard vyššie cez redirect na /login; tam musí zostať formulár (`to.redirectedFrom`/`from`).
    const loginWasRequestedExplicitly =
      !!to.redirectedFrom || _from.matched.length > 0;
    if (to.path === '/login') {
      if (authStore.isLoggedIn) {
        return next('/');
      }
      if (!loginWasRequestedExplicitly) {
        return next('/');
      }
    }

    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
      return next('/login');
    }

    // Povinná zmena hesla má prednosť pred všetkými ostatnými stránkami.
    if (authStore.isLoggedIn && authStore.user?.mustChangePassword && to.path !== '/') {
      return next('/');
    }

    const requiredRoles = to.meta.roles as string[] | undefined;
    if (requiredRoles && authStore.user) {
      if (!requiredRoles.includes(authStore.user.role)) {
        return next('/');
      }
    }

    next();
  });

  return Router;
});
