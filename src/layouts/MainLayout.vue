<template>
  <q-layout view="hHh lpR fFf">
    <q-header v-if="showHeader" class="bg-white text-primary header-styled">
      <q-toolbar class="toolbar-tight">
        <q-btn
          v-if="!isIndexPage"
          flat
          round
          dense
          icon="arrow_back"
          color="grey-8"
          class="q-mr-sm"
          @click="goBack"
        />

        <q-toolbar-title class="toolbar-title-section">
          <div class="system-title">{{ toolbarTitleText }}</div>
        </q-toolbar-title>

        <q-space />

        <template v-if="!isCompactToolbar">
          <q-btn
            v-if="showHeaderLiveWorkToggle"
            flat
            no-caps
            color="primary"
            :icon="liveWorkToolbarIcon"
            :label="liveWorkToolbarLabel"
            class="q-mr-xs"
            @click="onLiveWorkToolbarClick"
          />

          <q-btn
            v-if="showHeaderFullscreenToggle"
            flat
            no-caps
            color="primary"
            :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
            :label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
            class="q-mr-xs"
            @click="toggleFullscreen"
          />

          <q-btn-dropdown
            v-if="authStore.isLoggedIn"
            flat
            no-caps
            icon="person"
            class="q-mr-sm"
            :label="authStore.user?.fullName"
          >
            <q-list>
              <template v-if="authStore.isAdmin">
                <q-item clickable v-close-popup @click="void router.push('/users')">
                  <q-item-section avatar>
                    <q-icon name="manage_accounts" />
                  </q-item-section>
                  <q-item-section>Správa používateľov</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="showCreateCompetition = true">
                  <q-item-section avatar>
                    <q-icon name="add_circle_outline" />
                  </q-item-section>
                  <q-item-section>Nová súťaž</q-item-section>
                </q-item>
                <q-separator />
              </template>
              <q-item clickable v-close-popup @click="showChangePassword = true">
                <q-item-section avatar>
                  <q-icon name="lock" />
                </q-item-section>
                <q-item-section>Zmeniť heslo</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="handleLogout">
                <q-item-section avatar>
                  <q-icon name="logout" color="negative" />
                </q-item-section>
                <q-item-section class="text-negative">Odhlásiť sa</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>

          <q-btn
            v-if="!authStore.isLoggedIn"
            unelevated
            rounded
            color="primary"
            label="Prihlásiť sa"
            icon="login"
            class="q-px-lg"
            @click="goToLogin"
          />
        </template>

        <template v-else>
          <q-btn
            flat
            round
            dense
            icon="menu"
            color="primary"
            aria-label="Menu"
            @click="mobileMenuOpen = true"
          />
        </template>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-if="isCompactToolbar"
      v-model="mobileMenuOpen"
      side="right"
      overlay
      bordered
      behavior="mobile"
      :width="280"
      class="mobile-toolbar-drawer"
    >
      <q-toolbar class="text-primary bg-white mobile-drawer-toolbar">
        <q-space />
        <q-btn flat round dense icon="close" aria-label="Zavrieť" @click="mobileMenuOpen = false" />
      </q-toolbar>
      <q-separator />
      <q-scroll-area class="mobile-drawer-scroll">
        <q-list padding class="mobile-drawer-list">
          <q-item v-if="authStore.isLoggedIn && authStore.user" class="mobile-drawer-user">
            <q-item-section>
              <q-item-label caption>Prihlásený</q-item-label>
              <q-item-label class="text-weight-medium">{{ authStore.user.fullName }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator v-if="showHeaderLiveWorkToggle || showHeaderFullscreenToggle" />

          <q-item
            v-if="showHeaderLiveWorkToggle"
            clickable
            v-ripple
            @click="onMobileLiveWorkClick"
          >
            <q-item-section avatar>
              <q-icon :name="liveWorkToolbarIcon" color="primary" />
            </q-item-section>
            <q-item-section>{{ liveWorkToolbarLabel }}</q-item-section>
          </q-item>

          <q-item
            v-if="showHeaderFullscreenToggle"
            clickable
            v-ripple
            @click="onMobileFullscreenClick"
          >
            <q-item-section avatar>
              <q-icon :name="isFullscreen ? 'fullscreen_exit' : 'fullscreen'" color="primary" />
            </q-item-section>
            <q-item-section>{{
              isFullscreen ? 'Opustiť celú obrazovku' : 'Celá obrazovka'
            }}</q-item-section>
          </q-item>

          <template v-if="authStore.isAdmin">
            <q-separator spaced />
            <q-item-label header>Administrácia</q-item-label>
            <q-item
              clickable
              v-ripple
              @click="
                mobileMenuOpen = false;
                void router.push('/users');
              "
            >
              <q-item-section avatar>
                <q-icon name="manage_accounts" />
              </q-item-section>
              <q-item-section>Správa používateľov</q-item-section>
            </q-item>
            <q-item
              clickable
              v-ripple
              @click="
                mobileMenuOpen = false;
                showCreateCompetition = true;
              "
            >
              <q-item-section avatar>
                <q-icon name="add_circle_outline" />
              </q-item-section>
              <q-item-section>Nová súťaž</q-item-section>
            </q-item>
          </template>

          <template v-if="authStore.isLoggedIn">
            <q-separator spaced />
            <q-item
              clickable
              v-ripple
              @click="
                mobileMenuOpen = false;
                showChangePassword = true;
              "
            >
              <q-item-section avatar>
                <q-icon name="lock" />
              </q-item-section>
              <q-item-section>Zmeniť heslo</q-item-section>
            </q-item>
            <q-item
              clickable
              v-ripple
              @click="onMobileLogoutClick"
            >
              <q-item-section avatar>
                <q-icon name="logout" color="negative" />
              </q-item-section>
              <q-item-section class="text-negative">Odhlásiť sa</q-item-section>
            </q-item>
          </template>

          <q-item v-if="!authStore.isLoggedIn" clickable v-ripple @click="onMobileLoginClick">
            <q-item-section avatar>
              <q-icon name="login" color="primary" />
            </q-item-section>
            <q-item-section>Prihlásiť sa</q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container v-show="!mustChangePassword">
      <router-view />
    </q-page-container>

    <!-- Povinná zmena hesla -->
    <q-dialog
      :model-value="mustChangePassword && authStore.isLoggedIn"
      persistent
      no-esc
      :no-backdrop-dismiss="true"
      @update:model-value="() => {}"
    >
      <q-card style="min-width: 360px; max-width: 420px">
        <q-card-section>
          <div class="text-h6">Nastavte si heslo</div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            Toto je vaše prvé prihlásenie alebo vám administrátor nastavil nové heslo. Zadajte aktuálne heslo a zvoľte
            vlastné nové heslo.
          </div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="onForcedChangePassword" class="q-gutter-md">
            <q-input
              v-model="fCurrentPwd"
              label="Aktuálne heslo"
              type="password"
              outlined
              dense
              :rules="[val => !!val || 'Povinné']"
            />
            <q-input
              v-model="fNewPwd"
              label="Nové heslo"
              type="password"
              outlined
              dense
              hint="8–64 znakov, aspoň jedno písmeno a jedno číslo"
              :rules="passwordRules"
            />
            <q-input
              v-model="fConfirmPwd"
              label="Potvrdiť nové heslo"
              type="password"
              outlined
              dense
              :rules="[val => val === fNewPwd || 'Heslá sa nezhodujú']"
            />
            <div v-if="fPwdError" class="text-negative text-body2">{{ fPwdError }}</div>
            <div class="row justify-between q-mt-sm">
              <q-btn flat color="grey-8" label="Odhlásiť" no-caps @click="onForcedLogout" />
              <q-btn type="submit" color="primary" label="Uložiť heslo" :loading="fPwdLoading" unelevated no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Change password dialog -->
    <q-dialog v-model="showChangePassword">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Zmeniť heslo</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="onChangePassword" class="q-gutter-md">
            <q-input
              v-model="currentPwd"
              label="Aktuálne heslo"
              type="password"
              outlined
              dense
              :rules="[val => !!val || 'Povinné']"
            />
            <q-input
              v-model="newPwd"
              label="Nové heslo"
              type="password"
              outlined
              dense
              hint="8–64 znakov, aspoň jedno písmeno a jedno číslo"
              :rules="passwordRules"
            />
            <q-input
              v-model="confirmPwd"
              label="Potvrdiť nové heslo"
              type="password"
              outlined
              dense
              :rules="[val => val === newPwd || 'Heslá sa nezhodujú']"
            />
            <div v-if="pwdError" class="text-negative text-body2">{{ pwdError }}</div>
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn flat label="Zrušiť" v-close-popup />
              <q-btn type="submit" color="primary" label="Zmeniť" :loading="pwdLoading" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Vytvoriť súťaž -->
    <q-dialog v-model="showCreateCompetition">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Nová súťaž</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="onCreateCompetition">
            <div class="field-block">
              <div class="field-label">Názov súťaže</div>
              <q-input
                v-model="newCompName"
                outlined
                dense
                hide-bottom-space
                :rules="[val => !!val || 'Povinné pole']"
              />
            </div>
            <div class="field-block">
              <div class="field-label">Dátum</div>
              <q-input
                v-model="newCompDate"
                outlined
                dense
                type="date"
                hide-bottom-space
                :rules="[val => !!val || 'Povinné pole']"
              />
            </div>
            <div class="field-block">
              <div class="field-label">Lokácia</div>
              <q-input
                v-model="newCompLocation"
                outlined
                dense
                hide-bottom-space
                placeholder="Napr. Bratislava, Incheba"
              />
            </div>
            <div class="field-block">
              <div class="field-label">Krátky popis</div>
              <q-input
                v-model="newCompDescription"
                type="textarea"
                autogrow
                :rows="3"
                outlined
                dense
                hide-bottom-space
              />
            </div>
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn flat label="Zrušiť" v-close-popup />
              <q-btn type="submit" color="primary" label="Vytvoriť" :loading="creatingComp" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { useCompetitionStore } from 'src/stores/competition';
import { useLiveNavigationStore, isLiveViewFullPath } from 'src/stores/liveNavigation';
import { useCompetitionAutoNavigation } from 'src/composables/useCompetitionAutoNavigation';
import { api } from 'src/boot/axios';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const compStore = useCompetitionStore();
const liveNav = useLiveNavigationStore();

const mobileMenuOpen = ref(false);

const isCompactToolbar = computed(() => $q.screen.lt.sm);

const toolbarTitleText = computed(() =>
  isCompactToolbar.value ? 'Cat Show' : 'Cat Show Judging System',
);

const isIndexPage = computed(() => route.path === '/' || route.path === '');
const isLoginPage = computed(() => route.path === '/login');
const isFullscreen = ref(false);
const mustChangePassword = computed(() => !!authStore.user?.mustChangePassword);
const showHeader = computed(() => {
  if (isLoginPage.value) return false;
  if (mustChangePassword.value) return false;
  if (isOnLiveView.value && isFullscreen.value) return false;
  return true;
});

/** Roly s prístupom ku live náhľadu v hlavičke. */
const COMPETITION_ROLES_WITH_LIVE_ACCESS = new Set([
  'judge',
  'administrator',
  'telka',
  'exhibitor',
  'steward',
]);

const competitionIdFromRoute = computed((): number | null => {
  const raw = route.params.competitionId;
  if (raw == null || raw === '') return null;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : null;
});

useCompetitionAutoNavigation({
  competitionId: competitionIdFromRoute,
  route,
  router,
});

const showCompetitionLiveMonitoring = computed(() => {
  const cid = competitionIdFromRoute.value;
  if (cid == null || !authStore.isLoggedIn) return false;
  if (authStore.isAdmin) return true;
  const u = authStore.user;
  if (!u) return false;
  return u.competitionRoles.some(
    (cr) => Number(cr.competitionId) === cid && COMPETITION_ROLES_WITH_LIVE_ACCESS.has(cr.role)
  );
});

const isOnLiveView = computed(() => isLiveViewFullPath(route.fullPath));
const showHeaderFullscreenToggle = computed(() => isOnLiveView.value);

function syncFullscreenState() {
  isFullscreen.value = !!document.fullscreenElement;
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  } catch {
    /* noop */
  }
}

/** Toggle medzi Live monitoringom a rozhraním v hlavičke. */
const showHeaderLiveWorkToggle = computed(() => {
  if (competitionIdFromRoute.value == null) return false;
  if (isOnLiveView.value) {
    if (authStore.isLoggedIn) return showCompetitionLiveMonitoring.value;
    return liveNav.returnPath != null && liveNav.returnPath !== '';
  }
  return showCompetitionLiveMonitoring.value;
});

const liveWorkToolbarLabel = computed(() => {
  if (!isOnLiveView.value) return 'Live monitoring';
  if (liveNav.returnPath === '/') return 'Späť na úvod';
  return 'Rozhranie';
});

const liveWorkToolbarIcon = computed(() => (isOnLiveView.value ? 'apps' : 'live_tv'));

function goToCompetitionLiveMonitoring() {
  const cid = competitionIdFromRoute.value;
  if (cid == null) return;
  if (!isLiveViewFullPath(route.fullPath)) {
    liveNav.setLiveReturnPath(route.fullPath);
  }
  void router.push(`/competition/${cid}/live-monitoring`);
}

function onLiveWorkToolbarClick() {
  if (isOnLiveView.value) {
    const p = liveNav.returnPath;
    liveNav.clearLiveReturnPath();
    void router.push(p || '/');
    return;
  }
  goToCompetitionLiveMonitoring();
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

function onMobileLiveWorkClick() {
  closeMobileMenu();
  onLiveWorkToolbarClick();
}

async function onMobileFullscreenClick() {
  await toggleFullscreen();
  closeMobileMenu();
}

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu();
  },
);

watch(isCompactToolbar, (compact) => {
  if (!compact) closeMobileMenu();
});

const showChangePassword = ref(false);
const currentPwd = ref('');
const newPwd = ref('');
const confirmPwd = ref('');
const pwdLoading = ref(false);
const pwdError = ref('');

const fCurrentPwd = ref('');
const fNewPwd = ref('');
const fConfirmPwd = ref('');
const fPwdLoading = ref(false);
const fPwdError = ref('');

// Nová súťaž (dialog)
const showCreateCompetition = ref(false);
const newCompName = ref('');
const newCompDate = ref('');
const newCompLocation = ref('');
const newCompDescription = ref('');
const creatingComp = ref(false);

function refreshAuthState() {
  if (authStore.token) void authStore.fetchMe();
}

onMounted(async () => {
  if (authStore.token && !authStore.user) {
    await authStore.fetchMe();
  }
  syncFullscreenState();
  document.addEventListener('fullscreenchange', syncFullscreenState);
  window.addEventListener('auth:must-change-password', refreshAuthState);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState);
  window.removeEventListener('auth:must-change-password', refreshAuthState);
});

const goToLogin = () => {
  void router.push('/login');
};

function onMobileLoginClick() {
  closeMobileMenu();
  goToLogin();
}

const goBack = () => {
  void router.push('/');
};

const handleLogout = async () => {
  await authStore.logout();
  void router.push('/');
};

async function onMobileLogoutClick() {
  closeMobileMenu();
  await handleLogout();
}

const STRONG_PASSWORD_REGEX = /^(?=.*\p{L})(?=.*\d).{8,64}$/u;
const passwordRules = [
  (val: string) => !!val || 'Povinné',
  (val: string) =>
    STRONG_PASSWORD_REGEX.test(val) ||
    'Heslo musí mať 8–64 znakov, aspoň jedno písmeno a jedno číslo',
];

function pickPasswordError(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: { message?: string }[] } } })
    ?.response?.data;
  return data?.errors?.[0]?.message || data?.message || 'Chyba pri zmene hesla';
}

const onChangePassword = async () => {
  pwdLoading.value = true;
  pwdError.value = '';
  try {
    await authStore.changePassword(currentPwd.value, newPwd.value);
    showChangePassword.value = false;
    currentPwd.value = '';
    newPwd.value = '';
    confirmPwd.value = '';
    $q.notify({ type: 'positive', message: 'Heslo bolo úspešne zmenené', position: 'top' });
  } catch (err: unknown) {
    pwdError.value = pickPasswordError(err);
  } finally {
    pwdLoading.value = false;
  }
};

async function onForcedChangePassword() {
  fPwdLoading.value = true;
  fPwdError.value = '';
  try {
    await authStore.changePassword(fCurrentPwd.value, fNewPwd.value);
    fCurrentPwd.value = '';
    fNewPwd.value = '';
    fConfirmPwd.value = '';
    $q.notify({ type: 'positive', message: 'Heslo bolo uložené. Môžete pokračovať.', position: 'top' });
  } catch (err: unknown) {
    fPwdError.value = pickPasswordError(err);
  } finally {
    fPwdLoading.value = false;
  }
}

async function onForcedLogout() {
  fPwdError.value = '';
  await authStore.logout();
  void router.push('/login');
}

const onCreateCompetition = async () => {
  creatingComp.value = true;
  try {
    await api.post('/competitions', {
      name: newCompName.value,
      date: newCompDate.value,
      location: newCompLocation.value.trim() || null,
      description: newCompDescription.value.trim() || null,
    });
    showCreateCompetition.value = false;
    newCompName.value = '';
    newCompDate.value = '';
    newCompLocation.value = '';
    newCompDescription.value = '';
    await compStore.fetchAll();
    $q.notify({ type: 'positive', message: 'Súťaž bola vytvorená', position: 'top' });
  } catch {
    $q.notify({ type: 'negative', message: 'Chyba pri vytváraní súťaže', position: 'top' });
  } finally {
    creatingComp.value = false;
  }
};
</script>

<style scoped>
.header-styled {
  box-shadow: none !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.toolbar-title-section {
  min-width: 0;
}

.system-title {
  font-size: 0.875rem;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-tight {
  min-height: 56px;
}

.mobile-drawer-list {
  padding-top: 0;
}

.mobile-drawer-scroll {
  height: calc(100vh - 57px);
}

.mobile-drawer-toolbar {
  min-height: 48px;
}

.mobile-drawer-user {
  min-height: 64px;
}

.mobile-drawer-user :deep(.q-item__section--main) {
  justify-content: center;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 6px;
}

.field-block {
  margin-bottom: 10px;
}
</style>
