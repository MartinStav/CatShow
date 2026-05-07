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
            <div class="legend-box judging"></div>
            <span>Hotovo</span>
          </div>
          <div class="legend-item">
            <div class="legend-box called"></div>
            <span>Volaná</span>
          </div>
          <div class="legend-item">
            <div class="legend-box empty"></div>
            <span>V rade</span>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Všetky volané + mačky na nose v jednej mriežke; čakajúce samostatne -->
    <div class="tables-grid">
      <q-card class="table-card ring-all-card">
        <q-card-section class="table-content ring-all-section">
          <div class="section-title ring-main-title">
            VOLANÉ ({{ ringDisplayTiles.length }})
          </div>
          <template v-if="ringDisplayTiles.length > 0">
            <div class="ring-inner-grid">
              <div
                v-for="item in ringDisplayTiles"
                :key="`${item.phase}-${item.cat.id}-${item.cat.judgeId ?? 0}`"
                class="cat-tile"
                :class="{
                  'cat-tile-judging': item.phase === 'judging',
                  'cat-tile-called': item.phase === 'called',
                  'cat-tile-done': item.phase === 'completed',
                }"
              >
                <div v-if="item.phase !== 'completed'" class="tile-phase-label">
                  {{ phaseLabel(item.phase) }}
                </div>
                <div v-else class="tile-phase-label tile-phase-done">POSLEDNÁ</div>
                <div
                  class="cat-id"
                  :class="{ 'cat-id-completed': item.phase === 'completed' }"
                >
                  {{ item.cat.registrationNumber ?? item.cat.id }}
                </div>
                <div class="cat-name">{{ item.cat.name }}</div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="empty-indicator">
              <div class="empty-line"></div>
            </div>
            <q-badge outline color="grey" class="status-badge empty-badge">Prázdny ring</q-badge>
          </template>
        </q-card-section>
      </q-card>

      <q-card class="table-card table-empty next-queue-card">
        <q-card-section class="table-content next-queue-section">
          <div class="section-title waiting-label">ĎALŠIE V RADE ({{ nextUp.length }})</div>
          <template v-if="nextUp.length > 0">
            <div class="next-inner-grid">
              <div
                v-for="cat in nextUp"
                :key="`${cat.id}-${cat.judgeId ?? 0}-wait`"
                class="cat-tile cat-tile-waiting"
              >
                <div class="cat-id cat-id-smaller">{{ cat.registrationNumber ?? cat.id }}</div>
                <div class="cat-name">{{ cat.name }}</div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="empty-indicator">
              <div class="empty-line"></div>
            </div>
            <q-badge outline color="grey" class="status-badge empty-badge">Koniec poradia</q-badge>
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

interface RingCat {
  id: string;
  registrationNumber?: string;
  name: string;
  breed?: string;
  group?: string;
  exhibitor?: string;
  judgeId?: number;
}

interface Competition {
  id: string;
  name: string;
  currentRound?: string;
  status?: string;
}

interface MonitoringRingResponse {
  competition: Competition;
  runTimer?: RunTimerPayload;
  called: RingCat[];
  judging: RingCat[];
  nextUp: RingCat[];
  lastCompleted?: RingCat | null;
}

const route = useRoute();
const router = useRouter();
const competition = ref<Competition | null>(null);
const called = ref<RingCat[]>([]);
const judging = ref<RingCat[]>([]);
const nextUp = ref<RingCat[]>([]);
const lastCompleted = ref<RingCat | null>(null);
const runTimer = ref<RunTimerPayload | null>(null);
const runTimerTick = ref(0);
let runTimerDisplayInterval: ReturnType<typeof setInterval> | null = null;

const competitionStavText = computed(() => stavSutazeText(runTimer.value?.status));

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

type RingOverlayPhase = 'judging' | 'called' | 'completed'

const ringDisplayTiles = computed<{ phase: RingOverlayPhase; cat: RingCat }[]>(() => {
  const tiles: { phase: RingOverlayPhase; cat: RingCat }[] = []
  for (const c of judging.value) tiles.push({ phase: 'judging', cat: c })
  for (const c of called.value) tiles.push({ phase: 'called', cat: c })
  if (tiles.length === 0 && lastCompleted.value != null) {
    tiles.push({ phase: 'completed', cat: lastCompleted.value })
  }
  return tiles
})

function phaseLabel(phase: RingOverlayPhase): string {
  if (phase === 'judging') return 'ODPOÚVANIE'
  if (phase === 'called') return 'VOLANÁ'
  return ''
}

async function fetchMonitoringRing() {
  const competitionId = route.params.competitionId as string;
  if (!competitionId) return;
  try {
    const { data } = await api.get<MonitoringRingResponse>(`/live/${competitionId}/monitoring-ring`);
    const round = data.competition?.currentRound;
    if (round !== 'ring1' && round !== 'ring2') {
      void router.replace(`/competition/${competitionId}/live-scoring`);
      return;
    }
    competition.value = data.competition;
    called.value = data.called ?? [];
    judging.value = data.judging ?? [];
    nextUp.value = data.nextUp ?? [];
    lastCompleted.value = data.lastCompleted ?? null;
    if (data.runTimer) {
      runTimer.value = data.runTimer;
    }
  } catch {
    // keep previous data on error
  }
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  void fetchMonitoringRing();
  refreshInterval = setInterval(() => void fetchMonitoringRing(), 5000);
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
}

.legend-box.judging {
  border: 2px solid #15803d;
  background-color: #ecfdf3;
}

.legend-box.called {
  border: 2px solid #51a2ff;
  background-color: #eff6ff;
}

.legend-box.empty {
  border: 1px solid #d1d5dc;
  background-color: #f3f4f6;
}

.tables-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ring-all-card {
  border: 1px solid #e5e7eb !important;
  width: 100%;
}

.next-queue-card {
  width: 100%;
}

.ring-all-section,
.next-queue-section {
  align-items: stretch;
}

.ring-main-title {
  color: #0f172a;
  margin-bottom: 0.75rem;
}

.ring-inner-grid,
.next-inner-grid {
  display: grid;
  width: 100%;
  align-content: start;
  justify-content: start;
  /* Čo najviac stĺpcov vedľa seba; na úzkom displeji max. 2 stĺpce ak sa zmestia */
  grid-template-columns: repeat(auto-fill, minmax(min(145px, 100%), 1fr));
  gap: 0.65rem 0.75rem;
}

@media (min-width: 768px) {
  .ring-inner-grid,
  .next-inner-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem 0.85rem;
  }
}

@media (min-width: 1200px) {
  .ring-inner-grid {
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
    gap: 0.7rem 0.8rem;
  }

  .next-inner-grid {
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  }
}

@media (min-width: 1600px) {
  .ring-inner-grid {
    grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
  }

  .next-inner-grid {
    grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  }
}

.cat-tile {
  border-radius: 10px;
  padding: 0.65rem 0.55rem;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

@media (min-width: 1200px) {
  .cat-tile {
    min-height: 108px;
    padding: 0.55rem 0.45rem;
  }

  .tile-phase-label {
    font-size: 0.5625rem;
    margin-bottom: 0.25rem;
  }
}

.cat-tile-judging {
  border: 2px solid #15803d;
  background: #ecfdf3;
}

.cat-tile-called {
  border: 2px solid #51a2ff;
  background: #eff6ff;
}

.cat-tile-done {
  border: 2px solid #15803d;
  background: #ecfdf3;
  opacity: 0.92;
}

.cat-tile-waiting {
  border: 1px solid #d1d5dc;
  background: #fafafa;
}

.tile-phase-label {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-bottom: 0.35rem;
  color: #64748b;
}

.tile-phase-done {
  color: #15803d;
}

.table-card {
  min-height: 120px;
}

.table-empty {
  border: 1px solid #d1d5dc !important;
  background: #f3f4f6 !important;
}

.table-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
  height: 100%;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.waiting-label {
  color: #1e2939;
}

.cat-id-smaller {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
}

.cat-tile-waiting .cat-id {
  color: #1f2937;
}

.cat-id {
  font-size: clamp(1.85rem, 5.5vw, 3rem);
  font-weight: 500;
  line-height: 1;
}

.cat-tile-called .cat-id {
  color: #1e40af;
}

.cat-tile-judging .cat-id,
.cat-tile-done .cat-id {
  color: #15803d;
}

.cat-id-completed {
  color: #15803d;
}

.cat-name {
  font-size: clamp(0.6875rem, 1.5vw, 0.8125rem);
  color: #374151;
  line-height: 1.2;
  word-break: break-word;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 1rem;
  margin-top: 0.5rem;
}

.empty-badge {
  border-color: #D1D5DC !important;
  color: #6b7280 !important;
}

.empty-indicator {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.empty-line {
  width: 40px;
  height: 2px;
  background-color: #d1d5db;
}
</style>
