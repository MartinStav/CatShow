<template>
  <q-page class="admin-page">
    <div class="page-wrapper">
      <!-- Loading -->
      <div v-if="ctx.loading.value" class="text-center q-pa-xl">
        <q-spinner size="40px" color="dark" />
        <div class="q-mt-md text-grey-6">Načítavam súťaž...</div>
      </div>

      <!-- No competition found -->
      <div v-else-if="!ctx.competitionId.value" class="text-center q-pa-xl">
        <q-icon name="info" size="48px" color="grey-5" class="q-mb-md" />
        <div class="text-h6 q-mb-sm">Žiadna súťaž</div>
        <div class="text-grey-6 q-mb-lg">Vytvorte novú súťaž alebo importujte dáta.</div>
      </div>

      <!-- Main content -->
      <template v-else>
        <!-- Header -->
        <div class="row items-start justify-between q-mb-lg">
          <div>
            <div class="page-title">{{ ctx.competition.value.name }}</div>
            <div class="page-subtitle">{{ formattedDate }}</div>
          </div>
          <div class="row q-gutter-sm">
            <q-badge color="dark" class="header-badge">{{ statusLabel }}</q-badge>
            <q-badge outline color="grey-7" text-color="grey-7" class="header-badge">
              {{ currentRoundLabel }}
            </q-badge>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="row q-col-gutter-md q-mb-lg items-stretch summary-cards-row">
          <div
            v-for="card in summaryCards"
            :key="card.label"
            class="col-6 col-sm-3 summary-card-col"
          >
            <q-card class="summary-card full-height full-width">
              <q-card-section class="summary-card-section">
                <div class="row items-start justify-between">
                  <div class="summary-label">{{ card.label }}</div>
                  <q-icon :name="card.icon" size="20px" color="grey-5" class="gt-xs" />
                </div>
                <div class="summary-number">{{ card.value }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs-container q-mb-lg">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-btn"
            :class="{ active: activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <AdminDashboardTab v-if="activeTab === 'dashboard'" />
        <AdminCatsTab v-else-if="activeTab === 'cats'" />
        <AdminJudgesTab v-else-if="activeTab === 'judges-tab'" />
        <AdminJudgeProtocolTab v-else-if="activeTab === 'judge-protocol-tab'" />
        <AdminStewardsTab v-else-if="activeTab === 'stewards-tab'" />
        <AdminExhibitorsTab v-else-if="activeTab === 'exhibitors-tab'" />
        <AdminResultsTab v-else-if="activeTab === 'results'" />
        <AdminSettingsTab v-else-if="activeTab === 'settings'" />
        <AdminImportExportTab v-else-if="activeTab === 'import-export'" />
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWcfTaxonomyStore } from 'src/stores/wcf_taxonomy';
import {
  ROUND_LABEL_MAP,
  STATUS_LABEL_MAP,
  provideAdminCompetition,
} from 'src/composables/useAdminCompetition';
import AdminDashboardTab from 'src/components/admin/AdminDashboardTab.vue';
import AdminCatsTab from 'src/components/admin/AdminCatsTab.vue';
import AdminJudgesTab from 'src/components/admin/AdminJudgesTab.vue';
import AdminJudgeProtocolTab from 'src/components/admin/AdminJudgeProtocolTab.vue';
import AdminStewardsTab from 'src/components/admin/AdminStewardsTab.vue';
import AdminExhibitorsTab from 'src/components/admin/AdminExhibitorsTab.vue';
import AdminResultsTab from 'src/components/admin/AdminResultsTab.vue';
import AdminSettingsTab from 'src/components/admin/AdminSettingsTab.vue';
import AdminImportExportTab from 'src/components/admin/AdminImportExportTab.vue';

const route = useRoute();
const router = useRouter();
const taxStore = useWcfTaxonomyStore();
const ctx = provideAdminCompetition();

const tabs = [
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Mačky', value: 'cats' },
  { label: 'Rozhodcovia', value: 'judges-tab' },
  { label: 'Judge protokol', value: 'judge-protocol-tab' },
  { label: 'Stevardi', value: 'stewards-tab' },
  { label: 'Vystavovatelia', value: 'exhibitors-tab' },
  { label: 'Výsledky', value: 'results' },
  { label: 'Nastavenia', value: 'settings' },
  { label: 'Import/Export', value: 'import-export' },
];
const validTabValues = new Set(tabs.map((t) => t.value));

function normalizeTabValue(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && validTabValues.has(value) ? value : 'dashboard';
}

const activeTab = ref(normalizeTabValue(route.query.tab));

watch(
  () => route.query.tab,
  (tab) => {
    const normalized = normalizeTabValue(tab);
    if (activeTab.value !== normalized) activeTab.value = normalized;
  },
);

watch(activeTab, (tab) => {
  const current = normalizeTabValue(route.query.tab);
  if (current === tab) return;
  void router.replace({
    query: {
      ...route.query,
      tab,
    },
  });
});

const statusLabel = computed(
  () => STATUS_LABEL_MAP[ctx.competition.value.status] || ctx.competition.value.status,
);
const currentRoundLabel = computed(() => {
  const r = ctx.competition.value.currentRound;
  if (!r) return 'Neurčené';
  return ROUND_LABEL_MAP[r] || r;
});

const summaryCards = computed(() => [
  { label: 'Celkom mačiek', value: ctx.cats.value.length, icon: 'pets' },
  { label: 'Rozhodcovia', value: ctx.judges.value.length, icon: 'person' },
  { label: 'Ohodnotené', value: ctx.ratedCatsCount.value, icon: 'task_alt' },
  { label: 'BIS finalisti', value: ctx.bisFinalists.value, icon: 'emoji_events' },
]);

const formattedDate = computed(() => {
  try {
    const d = new Date(ctx.competition.value.date);
    if (isNaN(d.getTime())) return ctx.competition.value.date;
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return ctx.competition.value.date;
  }
});

// Pri zmene nastavení synchronizuj so serverom.
watch(
  ctx.settings,
  (val) => {
    void ctx.pushSettingsToServer({ ...val });
  },
  { deep: true },
);

onMounted(async () => {
  const id = route.params.competitionId ? Number(route.params.competitionId) : null;
  if (id) {
    ctx.competitionId.value = id;
    await ctx.loadSystemUsers();
    await ctx.loadDashboard();
    await ctx.loadJudges();
    void taxStore.loadAll(id);
  } else {
    ctx.loading.value = false;
  }
});
</script>

<style scoped>
.admin-page {
  padding: 1.5rem;
}

.page-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 13px;
  color: #666;
  margin-top: 2px;
}

.header-badge {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
}

.summary-cards-row {
  align-items: stretch;
}

.summary-card-col {
  display: flex;
}

.summary-card {
  border-radius: 10px;
  border: 1px solid #eee;
}

.summary-card-section {
  padding: 1rem;
}

.summary-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.summary-number {
  font-size: 26px;
  font-weight: 700;
  margin-top: 8px;
}

.tabs-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-bottom: 1px solid #ddd;
}

.tab-btn {
  background: none;
  border: none;
  padding: 10px 14px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.tab-btn:hover {
  color: #222;
}

.tab-btn.active {
  color: #222;
  font-weight: 600;
  border-bottom-color: #222;
}
</style>
