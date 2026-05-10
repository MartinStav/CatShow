<template>
  <q-page class="q-pa-lg">
    <!-- Header Card -->
    <q-card class="header-card q-mb-lg">
      <q-card-section class="header-content">
        <div class="header-title">{{ competition?.name ?? 'Loading...' }}</div>
        <div class="header-row">
          <q-badge color="dark" class="round-badge">
            {{ competition?.currentRound ?? '-' }}
          </q-badge>
          <q-badge
            v-if="showStavBadge"
            outline
            color="primary"
            class="round-badge stav-badge"
          >
            {{ competitionStavText }}
          </q-badge>
          <div class="timer">
            <q-icon name="schedule" size="20px" class="q-mr-xs" />
            {{ runTimeFormatted }}
          </div>
        </div>
        <div class="legend">
          <div class="legend-item">
            <div class="legend-box completed"></div>
            <span>Completed</span>
          </div>
          <div class="legend-item">
            <div class="legend-box judging"></div>
            <span>Being judged</span>
          </div>
          <div class="legend-item">
            <div class="legend-box called"></div>
            <span>Called</span>
          </div>
          <div class="legend-item">
            <div class="legend-box waiting"></div>
            <span>Waiting</span>
          </div>
        </div>
        <div v-if="totalCats != null" class="progress-summary">
          {{ completedCats ?? 0 }} / {{ totalCats }} completed
        </div>
      </q-card-section>
    </q-card>

    <!-- Cats by table (protokol) + status -->
    <div class="tables-grid" :style="tablesGridStyle">
      <q-card
        v-for="(tbl, tblIdx) in scoringTables"
        :key="tableCardKey(tbl, tblIdx)"
        class="table-card"
      >
        <q-card-section v-if="tbl.label" class="table-card-title-section">
          <div class="table-card-title">{{ tbl.label }}</div>
          <div v-if="tbl.key?.startsWith('table-')" class="table-card-meta q-mt-xs">
            <div v-if="tbl.protocolGroup" class="table-card-meta-line">
              {{ tbl.protocolGroup }}
            </div>
            <div v-if="tbl.judgeName" class="table-card-meta-line">
              {{ tbl.judgeName }}
            </div>
          </div>
        </q-card-section>
        <q-card-section class="table-content">
          <template v-if="tableHasActivity(tbl)">
            <!-- Judging -->
            <div v-if="tbl.judging.length > 0" class="status-section">
              <div class="status-label judging-label">JUDGING ({{ tbl.judging.length }})</div>
              <div
                v-for="cat in tbl.judging"
                :key="`${cat.id}-${cat.judgeId ?? 0}-j`"
                class="cat-row judging-border"
              >
                <div class="cat-name">{{ cat.name }}</div>
                <q-badge color="blue" class="cat-id-badge">{{ cat.registrationNumber ?? cat.id }}</q-badge>
              </div>
            </div>

            <!-- Called -->
            <div v-if="tbl.called.length > 0" class="status-section">
              <div class="status-label called-label">CALLED ({{ tbl.called.length }})</div>
              <div
                v-for="cat in tbl.called"
                :key="`${cat.id}-${cat.judgeId ?? 0}-c`"
                class="cat-row called-border"
              >
                <div class="cat-name">{{ cat.name }}</div>
                <q-badge color="orange" class="cat-id-badge">{{ cat.registrationNumber ?? cat.id }}</q-badge>
              </div>
            </div>

            <!-- Waiting -->
            <div v-if="tbl.waiting.length > 0" class="status-section">
              <div class="status-label waiting-label">WAITING ({{ tbl.waiting.length }})</div>
              <div class="badges-row">
                <q-badge
                  v-for="cat in tbl.waiting"
                  :key="`${cat.id}-${cat.judgeId ?? 0}-w`"
                  outline
                  color="grey-8"
                  class="waiting-badge"
                >
                  {{ cat.registrationNumber ?? cat.id }}
                </q-badge>
              </div>
            </div>

            <!-- Completed (count per table) -->
            <div v-if="tbl.completedCount > 0" class="status-section">
              <div class="status-label completed-label">COMPLETED ({{ tbl.completedCount }})</div>
              <div class="badges-row">
                <q-badge outline color="green" class="completed-badge">
                  {{ tbl.completedCount }} done
                </q-badge>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="no-activity">
              <div class="no-activity-line"></div>
              <div class="no-activity-text">No activity</div>
            </div>
          </template>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from 'src/boot/axios';
import {
  type RunTimerPayload,
  stavSutazeText,
  currentElapsedMs,
  formatStopwatchShort,
} from 'src/utils/liveRunTimerDisplay';

interface ActiveCat {
  id: string;
  registrationNumber?: string;
  name: string;
  breed?: string;
  group?: string;
  status: string;
  exhibitor?: string;
  /** Rozlíšenie rovnakého id mačky pri viacerých stoloch/sudcoch. */
  judgeId?: number;
}

interface Competition {
  id: string;
  name: string;
  status?: string;
  currentRound?: string;
}

interface ScoringTable {
  key?: string;
  tableNumber: number | null;
  label: string | null;
  protocolGroup?: string | null;
  judgeName?: string | null;
  judging: ActiveCat[];
  called: ActiveCat[];
  waiting: ActiveCat[];
  completedCount: number;
}

interface ScoringResponse {
  competition: Competition;
  runTimer?: RunTimerPayload;
  tables?: ScoringTable[];
  activeCats?: ActiveCat[];
  totalCats: number;
  completedCats: number;
}

const route = useRoute();
const router = useRouter();
const competition = ref<Competition | null>(null);
const scoringTables = ref<ScoringTable[]>([]);
const totalCats = ref<number | null>(null);
const completedCats = ref<number | null>(null);
const runTimer = ref<RunTimerPayload | null>(null);
const runTimerTick = ref(0);
let runTimerDisplayInterval: ReturnType<typeof setInterval> | null = null;

function tableHasActivity(tbl: ScoringTable): boolean {
  return (
    tbl.judging.length > 0 ||
    tbl.called.length > 0 ||
    tbl.waiting.length > 0 ||
    tbl.completedCount > 0
  );
}

function tableCardKey(tbl: ScoringTable, idx: number): string {
  if (tbl.key) return tbl.key;
  return tbl.tableNumber === null ? `unassigned-${idx}` : `table-${tbl.tableNumber}`;
}

const competitionStavText = computed(() => stavSutazeText(runTimer.value?.status));

/** Stav súťaže (badge) len keď už „začala“; pri „Ešte nezačala“ nech zostane len 00:00. */
const showStavBadge = computed(
  () => runTimer.value != null && runTimer.value.status !== 'scheduled',
);

const runTimeFormatted = computed(() => {
  void runTimerTick.value;
  if (!runTimer.value) return '00:00';
  return formatStopwatchShort(currentElapsedMs(runTimer.value));
});

function syncRunTimerLocalTick() {
  if (runTimer.value?.isRunning) {
    if (!runTimerDisplayInterval) {
      runTimerDisplayInterval = setInterval(() => {
        runTimerTick.value++;
      }, 1000);
    }
  } else if (runTimerDisplayInterval) {
    clearInterval(runTimerDisplayInterval);
    runTimerDisplayInterval = null;
  }
}

watch(() => runTimer.value?.isRunning, syncRunTimerLocalTick, { immediate: true });

/**
 * Dynamicky vypočíta optimálny počet stĺpcov pre mriežku stolov.
 * Max 5 v rade. Pre menší počet stolov sa rozloží pekne:
 * 1→1, 2→2, 3→3, 4→2, 5→5, 6→3, 7→4, 8→4, 9→5, 10→5
 */
const tablesGridCols = computed(() => {
  const count = scoringTables.value.length;
  if (count <= 0) return 1;
  if (count <= 3) return count;
  if (count === 4) return 2;
  if (count === 5) return 5;
  if (count <= 6) return 3;
  if (count <= 8) return 4;
  return 5;
});

const tablesGridStyle = computed(() => {
  const cols = tablesGridCols.value;
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '1rem',
  };
});

function legacySingleTableFromResponse(data: ScoringResponse): ScoringTable[] {
  const judging: ActiveCat[] = [];
  const called: ActiveCat[] = [];
  for (const cat of data.activeCats ?? []) {
    const s = (cat.status || '').toLowerCase();
    if (s === 'judging') judging.push(cat);
    else if (s === 'called') called.push(cat);
  }
  return [
    {
      tableNumber: 1,
      label: null,
      protocolGroup: null,
      judgeName: null,
      judging,
      called,
      waiting: [],
      completedCount: data.completedCats ?? 0,
    },
  ];
}

async function fetchScoring() {
  const competitionId = route.params.competitionId as string;
  if (!competitionId) return;
  try {
    const { data } = await api.get<ScoringResponse>(`/live/${competitionId}/scoring`);
    const round = data.competition?.currentRound;
    if (round === 'ring1' || round === 'ring2') {
      void router.replace(`/competition/${competitionId}/live-monitoring-ring`);
      return;
    }
    competition.value = data.competition;
    scoringTables.value =
      data.tables && data.tables.length > 0 ? data.tables : legacySingleTableFromResponse(data);
    totalCats.value = data.totalCats ?? 0;
    completedCats.value = data.completedCats ?? 0;
    if (data.runTimer) {
      runTimer.value = data.runTimer;
    }
  } catch {
    // keep previous data on error
  }
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  void fetchScoring();
  refreshInterval = setInterval(() => void fetchScoring(), 5000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  if (runTimerDisplayInterval) {
    clearInterval(runTimerDisplayInterval);
    runTimerDisplayInterval = null;
  }
});
</script>

<style scoped>
.header-card {
  text-align: center;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.header-title {
  font-size: 1.75rem;
  font-weight: 400;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.round-badge {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 1rem;
}

.stav-badge {
  max-width: 100%;
  text-align: center;
  white-space: normal;
  height: auto;
  min-height: 2.25rem;
  padding: 0.5rem 1rem;
}

.timer {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  color: #6b7280;
}

.legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.legend-box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid;
}

.legend-box.completed {
  border-color: #05DF72;
  background-color: #DCFCE7;
}

.legend-box.judging {
  border-color: #51A2FF;
  background-color: #DBEAFE;
}

.legend-box.called {
  border-color: #FF8904;
  background-color: #FFEDD4;
}

.legend-box.waiting {
  border-color: #99A1AF;
  background-color: #E5E7EB;
}

.progress-summary {
  font-size: 0.875rem;
  color: #6b7280;
}

.tables-grid {
  display: grid;
  gap: 1rem;
}

@media (max-width: 768px) {
  .tables-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (max-width: 480px) {
  .tables-grid {
    grid-template-columns: 1fr !important;
  }
}

.table-card {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.table-card-title-section {
  padding: 0.75rem 1rem 0;
  flex-shrink: 0;
}

.table-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.table-card-meta {
  text-align: center;
  font-size: 0.8125rem;
  color: #4b5563;
  line-height: 1.35;
}

.table-card-meta-line + .table-card-meta-line {
  margin-top: 0.15rem;
}

.table-header {
  padding: 1rem;
  text-align: center;
  background: #f3f4f6;
  border-radius: 0.875rem 0.875rem 0 0;
}

.table-header.has-activity {
  background: linear-gradient(135deg, #e0d4f7 0%, #f0e8ff 100%);
}

.table-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: #1f2937;
}

.table-category {
  font-size: 0.875rem;
  color: #1447E6;
  margin-top: 0.25rem;
}

.table-judge {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.table-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.judging-label {
  color: #51A2FF;
}

.called-label {
  color: #FF8904;
}

.completed-label {
  color: #016630;
}

.waiting-label {
  color: #1E2939;
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 2px solid;
}

.judging-border {
  border-color: #51A2FF;
  background-color: #DBEAFE;
}

.called-border {
  border-color: #FF8904;
  background-color: #FFEDD4;
}

.cat-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.cat-id-badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
}

.badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.completed-badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
  border: 2px solid #05DF72 !important;
  background-color: #DCFCE7 !important;
  color: #016630 !important;
}

.waiting-badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
  border: 2px solid #99A1AF !important;
  background-color: #E5E7EB !important;
  color: #1E2939 !important;
}

.no-activity {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.no-activity-line {
  width: 40px;
  height: 2px;
  background-color: #d1d5db;
}

.no-activity-text {
  font-size: 0.875rem;
  color: #9ca3af;
}
</style>
