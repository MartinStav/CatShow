import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';

interface CompetitionRole {
  id: number;
  competitionId: number;
  competitionName: string;
  role: string;
}

interface AuthUser {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: 'superadmin' | 'admin' | 'user' | 'demo';
  /** Po vytvorení účtu alebo seed superadmina – kým sa nezmení heslo. */
  mustChangePassword: boolean;
  competitionRoles: CompetitionRole[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));

  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(
    () => user.value?.role === 'superadmin' || user.value?.role === 'admin'
  );
  const isSuperadmin = computed(() => user.value?.role === 'superadmin');

  function setAuth(authUser: AuthUser, authToken: string) {
    user.value = {
      ...authUser,
      mustChangePassword: authUser.mustChangePassword ?? false,
    };
    token.value = authToken;
    localStorage.setItem('auth_token', authToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  }

  function clearAuth() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
  }

  async function login(identifier: string, password: string) {
    const { data } = await api.post('/auth/login', { identifier, password });
    setAuth(data.user, data.token);
    return data.user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* noop */
    }
    clearAuth();
  }

  async function fetchMe() {
    if (!token.value) return null;
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
    try {
      const { data } = await api.get('/auth/me');
      user.value = { ...data, mustChangePassword: data.mustChangePassword ?? false };
      return data;
    } catch {
      clearAuth();
      return null;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.put<{
      user?: { id: number; mustChangePassword: boolean };
    }>('/auth/change-password', { currentPassword, newPassword });
    if (user.value && data.user) {
      user.value.mustChangePassword = data.user.mustChangePassword;
    } else if (user.value) {
      user.value.mustChangePassword = false;
    }
  }

  function hasCompetitionRole(competitionId: number, roles: string[]): boolean {
    if (!user.value) return false;
    if (user.value.role === 'superadmin') return true;
    const cid = Number(competitionId);
    return user.value.competitionRoles.some(
      (cr) => Number(cr.competitionId) === cid && roles.includes(cr.role)
    );
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isSuperadmin,
    login,
    logout,
    fetchMe,
    changePassword,
    clearAuth,
    hasCompetitionRole,
  };
});
