<template>
  <q-page class="bis-page">
    <div class="page-container">
      <q-card class="main-card">
        <q-card-section>
          <div class="header-section">
            <div class="row items-center justify-center q-gutter-sm">
              <q-icon name="emoji_events" size="32px" color="amber" />
              <div class="page-title">Best in Show – Finále</div>
            </div>
            <div class="badges-row">
              <q-badge outline color="grey-7" text-color="grey-7" class="status-badge">
                Finalisti (NomBIS): {{ nomBisCount }}
              </q-badge>
              <q-badge outline color="amber-8" text-color="amber-8" class="status-badge">
                BIV víťazi: {{ bivCount }}
              </q-badge>
              <q-badge color="amber" text-color="dark" class="status-badge">
                BIS udelené: {{ bisCount }}
              </q-badge>
            </div>
          </div>

          <q-banner
            v-if="competitionRound !== 'bis'"
            rounded
            class="bg-orange-2 text-dark q-mb-md"
          >
            BIS / Finále ešte nie je spustené.
          </q-banner>

          <div v-if="canManage" class="row q-gutter-sm q-mb-md justify-end">
            <q-space />
            <q-btn
              outline
              color="primary"
              icon="sync"
              no-caps
              :loading="busyAction"
              label="Stiahnuť z hodnotení (NomBIS)"
              @click="syncNomBis"
            />
            <q-btn
              outline
              color="secondary"
              icon="calculate"
              no-caps
              :loading="busyAction"
              label="Zistiť BIV (Best in Variety)"
              @click="recomputeBiv"
            />
            <q-btn
              v-if="canFinishCompetition"
              unelevated
              color="positive"
              icon="check_circle"
              no-caps
              :loading="busyAction"
              label="Ukončiť súťaž"
              @click="confirmFinishCompetition"
            />
          </div>

          <q-tabs v-model="activeTab" align="justify" inline-label dense class="bis-tabs">
            <q-tab name="biv" icon="emoji_events" label="BIV víťazi" />
            <q-tab name="bis" icon="workspace_premium" label="BIS udelenie" />
          </q-tabs>

          <q-separator class="q-mb-md" />

          <!-- BIV -->
          <div v-if="activeTab === 'biv'">
            <div v-if="loading" class="text-center q-pa-lg">
              <q-spinner-dots color="primary" size="40px" />
            </div>
            <div v-else-if="bivAwards.length === 0" class="text-center text-grey-6 q-pa-xl">
              Zatiaľ žiadne BIV.
            </div>
            <div v-else>
              <q-table
                :rows="bivAwards"
                :columns="bivColumns"
                row-key="id"
                flat
                dense
                hide-bottom
                :rows-per-page-options="[0]"
              >
                <template v-slot:body-cell-cat="props">
                  <q-td :props="props">
                    <div class="cat-cell">
                      <strong>{{ props.row.cat?.name ?? '—' }}</strong>
                      <span class="text-caption text-grey-7">
                        {{ props.row.cat?.registrationNumber ?? '?' }} · {{ props.row.cat?.breed ?? '—' }}
                      </span>
                    </div>
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-right">
                    <q-btn
                      v-if="canManage"
                      flat
                      round
                      dense
                      icon="edit"
                      @click="openEdit(props.row)"
                    />
                    <q-btn
                      v-if="canManage"
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      @click="deleteAward(props.row.id)"
                    />
                  </q-td>
                </template>
              </q-table>
            </div>
            <div v-if="canManage" class="row justify-end q-mt-sm">
              <q-btn unelevated color="primary" icon="add" no-caps label="Pridať BIV" @click="openCreate('BIV')" />
            </div>
          </div>

          <!-- BIS -->
          <div v-if="activeTab === 'bis'">
            <div v-if="loading" class="text-center q-pa-lg">
              <q-spinner-dots color="primary" size="40px" />
            </div>
            <div v-else-if="bisAwards.length === 0" class="text-center text-grey-6 q-pa-xl">
              Zatiaľ žiadne BIS víťazi.
            </div>
            <div v-else>
              <q-table
                :rows="bisAwards"
                :columns="bisColumns"
                row-key="id"
                flat
                dense
                hide-bottom
                :rows-per-page-options="[0]"
              >
                <template v-slot:body-cell-cat="props">
                  <q-td :props="props">
                    <div class="cat-cell">
                      <strong>{{ props.row.cat?.name ?? '—' }}</strong>
                      <span class="text-caption text-grey-7">
                        {{ props.row.cat?.registrationNumber ?? '?' }} · {{ props.row.cat?.breed ?? '—' }}
                      </span>
                    </div>
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-right">
                    <q-btn
                      v-if="canManage"
                      flat
                      round
                      dense
                      icon="edit"
                      @click="openEdit(props.row)"
                    />
                    <q-btn
                      v-if="canManage"
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      @click="deleteAward(props.row.id)"
                    />
                  </q-td>
                </template>
              </q-table>
            </div>
            <div v-if="canManage" class="row justify-end q-mt-md">
              <q-btn unelevated color="amber-8" text-color="dark" icon="emoji_events" no-caps label="Pridať BIS víťaza" @click="openCreate('BIS')" />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Edit / Create dialog -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="min-width: 380px; max-width: 520px">
        <q-card-section>
          <div class="text-h6">{{ editing ? 'Upraviť BIS záznam' : 'Nové BIS udelenie' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="form.level"
            :options="[
              { label: 'BIV (Best in Variety)', value: 'BIV' },
              { label: 'BIS víťaz', value: 'BIS' },
            ]"
            label="Úroveň"
            outlined
            dense
            emit-value
            map-options
          />
          <q-select
            v-model="form.catId"
            :options="catOptions"
            label="Mačka *"
            outlined
            dense
            emit-value
            map-options
            use-input
            input-debounce="0"
            @filter="filterCatOptions"
          />
          <q-input
            v-model.number="form.position"
            type="number"
            label="Pozícia (1 = víťaz)"
            outlined
            dense
          />
          <q-input v-model="form.notes" label="Poznámka" type="textarea" autogrow outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Zrušiť" v-close-popup />
          <q-btn unelevated color="primary" label="Uložiť" @click="saveAward" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar, type QTableProps } from 'quasar';
import axios from 'axios';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';
import { useCompetitionRealtime } from 'src/composables/useCompetitionRealtime';

interface ApiCat {
  id: number;
  registrationNumber: string;
  name: string;
  breed: string;
  group: string;
  groups?: string[];
  class?: string | null;
  sex?: string | null;
}

interface BisAwardRow {
  id: number;
  competitionId: number;
  catId: number;
  judgeId: number | null;
  level: 'BIV' | 'NOM_BIS' | 'BIS';
  category: string | null;
  sex: string | null;
  classCode: string | null;
  position: number;
  notes: string | null;
  cat?: ApiCat;
  judge?: { id: number; name: string };
}

const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const competitionId = computed(() => Number(route.params.competitionId));

const competitionNumericId = computed(() =>
  Number.isFinite(competitionId.value) && competitionId.value >= 1 ? competitionId.value : null,
);

useCompetitionRealtime({
  competitionId: competitionNumericId,
  onInvalidate: () => void loadAll({ silent: true }),
});

const loading = ref(false);
const busyAction = ref(false);
const competitionRound = ref<string | null>(null);
const awards = ref<BisAwardRow[]>([]);
const cats = ref<ApiCat[]>([]);
const activeTab = ref<'biv' | 'bis'>('biv');

const canManage = computed(() => {
  if (!Number.isFinite(competitionId.value)) return false;
  return (
    authStore.isAdmin ||
    authStore.hasCompetitionRole(competitionId.value, ['administrator', 'judge'])
  );
});

const canFinishCompetition = computed(() => {
  if (!Number.isFinite(competitionId.value)) return false;
  return (
    authStore.isAdmin ||
    authStore.hasCompetitionRole(competitionId.value, ['administrator'])
  );
});

const nomBisAwards = computed(() => awards.value.filter((a) => a.level === 'NOM_BIS'));
const bivAwards = computed(() => awards.value.filter((a) => a.level === 'BIV'));
const bisAwards = computed(() => awards.value.filter((a) => a.level === 'BIS'));

const nomBisCount = computed(() => nomBisAwards.value.length);
const bivCount = computed(() => bivAwards.value.length);
const bisCount = computed(() => bisAwards.value.length);

const bivColumns: QTableProps['columns'] = [
  { name: 'category', label: 'Kategória', field: 'category', align: 'left' },
  { name: 'sex', label: 'Pohlavie', field: 'sex', align: 'left' },
  { name: 'classCode', label: 'Trieda', field: 'classCode', align: 'left' },
  { name: 'cat', label: 'Mačka', field: () => '', align: 'left' },
  { name: 'notes', label: 'Poznámka', field: 'notes', align: 'left' },
  { name: 'actions', label: '', field: () => '', align: 'right' },
];

const bisColumns: QTableProps['columns'] = [
  { name: 'category', label: 'Kategória / Best …', field: 'category', align: 'left' },
  { name: 'position', label: 'Poz.', field: 'position', align: 'center' },
  { name: 'cat', label: 'Mačka', field: () => '', align: 'left' },
  { name: 'sex', label: 'Pohlavie', field: 'sex', align: 'left' },
  { name: 'classCode', label: 'Trieda', field: 'classCode', align: 'left' },
  { name: 'notes', label: 'Poznámka', field: 'notes', align: 'left' },
  { name: 'actions', label: '', field: () => '', align: 'right' },
];

const catOptionsFiltered = ref<{ label: string; value: number }[]>([]);
const nomBisCatIds = computed(() => new Set(nomBisAwards.value.map((award) => award.catId)));
const selectableCats = computed(() =>
  form.value.level === 'BIS'
    ? cats.value.filter((cat) => nomBisCatIds.value.has(cat.id))
    : cats.value,
);
const catOptions = computed(() =>
  catOptionsFiltered.value.length > 0
    ? catOptionsFiltered.value
    : selectableCats.value.map((c) => ({
        label: `${c.registrationNumber} — ${c.name} (${c.breed})`,
        value: c.id,
      })),
);

function filterCatOptions(val: string, update: (cb: () => void) => void) {
  update(() => {
    const needle = val.trim().toLowerCase();
    const all = selectableCats.value.map((c) => ({
      label: `${c.registrationNumber} — ${c.name} (${c.breed})`,
      value: c.id,
    }));
    catOptionsFiltered.value = !needle
      ? all
      : all.filter((o) => o.label.toLowerCase().includes(needle));
  });
}

async function loadAll(opts: { silent?: boolean } = {}) {
  if (!Number.isFinite(competitionId.value)) return;
  if (!opts.silent) loading.value = true;
  try {
    const [compRes, awardsRes, catsRes] = await Promise.all([
      api.get<{ currentRound: string | null }>(`/competitions/${competitionId.value}`),
      api.get<BisAwardRow[]>(`/competitions/${competitionId.value}/bis-awards`),
      api.get<ApiCat[]>(`/competitions/${competitionId.value}/cats`),
    ]);
    competitionRound.value = compRes.data.currentRound;
    awards.value = awardsRes.data ?? [];
    cats.value = catsRes.data ?? [];
  } catch (err) {
    console.error('Failed to load BIS data:', err);
  } finally {
    if (!opts.silent) loading.value = false;
  }
}

onMounted(() => {
  void loadAll();
});

watch(competitionId, () => {
  void loadAll();
});

const dialogOpen = ref(false);
const editing = ref<BisAwardRow | null>(null);
const form = ref({
  level: 'BIS' as 'BIV' | 'BIS',
  catId: null as number | null,
  position: 1,
  notes: '',
});

function openCreate(level: 'BIV' | 'BIS') {
  editing.value = null;
  form.value = {
    level,
    catId: null,
    position: 1,
    notes: '',
  };
  dialogOpen.value = true;
}

function openEdit(row: BisAwardRow) {
  editing.value = row;
  form.value = {
    level: row.level === 'NOM_BIS' ? 'BIS' : row.level,
    catId: row.catId,
    position: row.position,
    notes: row.notes ?? '',
  };
  dialogOpen.value = true;
}

async function saveAward() {
  if (!canManage.value) {
    dialogOpen.value = false;
    return;
  }
  if (!form.value.catId) {
    $q.notify({ type: 'warning', message: 'Vyberte mačku.', position: 'top' });
    return;
  }
  if (form.value.level === 'BIS' && !nomBisCatIds.value.has(form.value.catId)) {
    $q.notify({
      type: 'warning',
      message: 'BIS je možné udeliť iba mačke, ktorá má NomBIS.',
      position: 'top',
    });
    return;
  }
  const payload = {
    catId: form.value.catId,
    level: form.value.level,
    category: null,
    sex: null,
    classCode: null,
    position: form.value.position,
    notes: form.value.notes.trim() || null,
  };
  try {
    if (editing.value) {
      await api.put(`/competitions/${competitionId.value}/bis-awards/${editing.value.id}`, payload);
    } else {
      await api.post(`/competitions/${competitionId.value}/bis-awards`, payload);
    }
    await loadAll({ silent: true });
    dialogOpen.value = false;
    $q.notify({ type: 'positive', message: 'Uložené', position: 'top' });
  } catch (err) {
    notifyError(err, 'Uloženie zlyhalo');
  }
}

function deleteAward(id: number) {
  if (!canManage.value) return;
  $q.dialog({
    title: 'Odstrániť záznam',
    message: 'Naozaj chcete odstrániť toto BIS udelenie?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${competitionId.value}/bis-awards/${id}`);
        await loadAll({ silent: true });
        $q.notify({ type: 'positive', message: 'Odstránené', position: 'top' });
      } catch (err) {
        notifyError(err, 'Odstránenie zlyhalo');
      }
    })();
  });
}

function confirmFinishCompetition() {
  if (!canFinishCompetition.value) return;
  $q.dialog({
    title: 'Ukončiť súťaž',
    message:
      'Naozaj chcete súťaž definitívne ukončiť? Po ukončení sa zobrazia len výsledky a obnovenie do aktívneho stavu sa dá vykonať len v Administrácii.',
    cancel: { label: 'Zrušiť', color: 'grey-8' },
    ok: { label: 'Ukončiť', color: 'positive', unelevated: true },
    persistent: true,
  }).onOk(() => {
    void (async () => {
      busyAction.value = true;
      try {
        await api.put(`/competitions/${competitionId.value}`, {
          status: 'finished',
          currentRound: null,
        });
        await loadAll({ silent: true });
        $q.notify({
          type: 'positive',
          message: 'Súťaž bola ukončená',
          position: 'top',
        });
      } catch (err) {
        notifyError(err, 'Ukončenie súťaže zlyhalo');
      } finally {
        busyAction.value = false;
      }
    })();
  });
}

function syncNomBis() {
  if (!canManage.value) return;
  $q.dialog({
    title: 'Synchronizovať Nominácie',
    message: 'Naozaj chcete stiahnuť udelené NomBIS z hodnotení rozhodcov? Toto premaže ručné zmeny u panelu finalistov a načíta dáta z hodnotení v základnom kole.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      busyAction.value = true;
      try {
        await api.post(`/competitions/${competitionId.value}/bis-awards/sync-nombis`);
        await loadAll({ silent: true });
        $q.notify({ type: 'positive', message: 'Nominácie skopírované', position: 'top' });
      } catch (err) {
        notifyError(err, 'Synchronizácia NomBIS zlyhala');
      } finally {
        busyAction.value = false;
      }
    })();
  });
}

function recomputeBiv() {
  if (!canManage.value) return;
  $q.dialog({
    title: 'Vypočítať BIV',
    message: 'Naozaj chcete nechať systém prepočítať všetkých Best in Variety podľa pravidla 3 mačiek v kategórii farby? Premažú sa existujúce BIV priradenia.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      busyAction.value = true;
      try {
        await api.post(`/competitions/${competitionId.value}/bis-awards/recompute-biv`, { force: true });
        await loadAll({ silent: true });
        $q.notify({ type: 'positive', message: 'BIV výpočet bol dokončený', position: 'top' });
      } catch (err) {
        notifyError(err, 'Výpočet BIV zlyhal');
      } finally {
        busyAction.value = false;
      }
    })();
  });
}

function notifyError(err: unknown, fallback: string) {
  const serverMsg =
    axios.isAxiosError(err) && typeof err.response?.data === 'object' && err.response?.data !== null
      ? (err.response.data as { message?: string }).message
      : undefined;
  $q.notify({
    type: 'negative',
    message: typeof serverMsg === 'string' && serverMsg.length > 0 ? serverMsg : fallback,
    position: 'top',
  });
}
</script>

<style scoped>
.bis-page {
  padding: 1.5rem;
}
.page-container {
  max-width: 1100px;
  margin: 0 auto;
}
.main-card {
  border-radius: 0.875rem;
}
.header-section {
  text-align: center;
  margin-bottom: 1rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}
.badges-row {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}
.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
}
.bis-tabs {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.bucket-card {
  border-radius: 0.75rem;
}
.bis-row {
  display: grid;
  grid-template-columns: 24px 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.bis-row:last-child {
  border-bottom: none;
}
.bis-cat-name {
  font-weight: 500;
}
.bis-cat-meta {
  font-size: 0.85rem;
  color: #64748b;
}
.cat-cell {
  display: flex;
  flex-direction: column;
}
</style>
