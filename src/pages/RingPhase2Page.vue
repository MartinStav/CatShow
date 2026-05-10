<template>
  <q-page class="page-container">
    <!-- Header Card -->
    <q-card class="header-card">
      <q-card-section class="header-content">
        <div class="header-title">
          <q-icon name="emoji_events" size="24px" color="amber" />
          <span>Ring - Phase 2: Ranking</span>
        </div>
        <div class="header-subtitle">
          Assign a position to each cat by clicking the 'Evaluation' button
        </div>
        <div
          v-if="
            !loading &&
            ring2PhaseActive &&
            currentJudgeId &&
            judgeSelfSteward &&
            !ring2SubmissionLocked &&
            cats.length > 0
          "
          class="row justify-end full-width q-mt-sm"
        >
          <q-btn
            class="call-next-steward-btn"
            label="Zavolať ďalšiu"
            icon="phone_forwarded"
            unelevated
            no-caps
            padding="sm lg"
            :loading="callNextBusy"
            @click="selfStewardCallNext"
          />
        </div>
        <q-btn-toggle
          v-if="
            !loading &&
            ring2PhaseActive &&
            currentJudgeId &&
            ring2ProtocolGroupTabs.length > 1 &&
            judgingOrders.length > 0
          "
          v-model="selectedRing2ProtocolGroup"
          :options="ring2ProtocolGroupToggleOptions"
          spread
          no-caps
          unelevated
          toggle-color="primary"
          color="grey-4"
          text-color="grey-9"
          class="full-width q-mt-sm protocol-group-toggle"
        />
      </q-card-section>
    </q-card>

    <q-banner
      v-if="!loading && !ring2PhaseActive"
      rounded
      class="bg-orange-2 text-dark q-mb-md"
    >
      Ring 2 (poradie) ešte nie je spustený.
    </q-banner>

    <q-banner
      v-if="ring2PhaseActive && duplicatePositions.length > 0"
      class="warning-banner q-mb-sm"
    >
      <template v-slot:avatar>
        <q-icon name="warning" color="orange" />
      </template>
      Duplicitné pozície: {{ duplicatePositions.join(', ') }}. Každá mačka musí mať jedinečnú pozíciu.
    </q-banner>

    <q-banner
      v-if="!loading && ring2PhaseActive && !currentJudgeId"
      rounded
      class="bg-red-2 text-dark q-mb-md"
    >
      Nemáte priradený záznam rozhodcu v tejto súťaži. Kontaktujte administrátora.
    </q-banner>

    <q-banner
      v-if="ring2PhaseActive && unassignedCount > 0"
      class="info-banner q-mb-md"
    >
      <template v-slot:avatar>
        <q-icon name="info" color="blue" />
      </template>
      {{ unassignedCount }} mačiek bez priradenej pozície.
    </q-banner>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-lg">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Cat List -->
    <q-card v-else-if="ring2PhaseActive && currentJudgeId" class="cats-card">
      <q-card-section>
        <div class="cat-list">
          <div
            v-for="cat in sortedCats"
            :key="cat.id"
            class="cat-card"
            :class="{ 'cat-card--with-steward-chip': judgeSelfSteward && !ring2SubmissionLocked }"
          >
            <div
              v-if="judgeSelfSteward && !ring2SubmissionLocked"
              class="ring2-self-steward-slot"
            >
              <JudgeSelfStewardStatusChip :status="cat.status" @cycle="cycleCatCallStatus(cat)" />
            </div>
            <!-- Position Badge -->
            <div
              class="position-badge"
              :class="{
                'position-gold': cat.position === 1,
                'position-silver': cat.position === 2,
                'position-bronze': cat.position === 3,
                'position-assigned': cat.position && cat.position > 3,
                'position-empty': !cat.position
              }"
            >
              <template v-if="cat.position">
                <q-icon name="emoji_events" size="16px" />
                <span>{{ cat.position }}.</span>
              </template>
              <template v-else>
                <span>—</span>
              </template>
            </div>

            <!-- Cat Info -->
            <div class="cat-info">
              <q-badge color="dark" class="cat-id-badge">{{ cat.registrationNumber }}</q-badge>
              <div class="cat-details">
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-breed">{{ cat.breed }}</div>
              </div>
            </div>

            <!-- Evaluation Button -->
            <q-btn
              :disable="ring2SubmissionLocked"
              :outline="!cat.position"
              :unelevated="!!cat.position"
              :color="cat.position ? 'dark' : 'grey-8'"
              class="eval-btn"
              @click="openPositionModal(cat)"
            >
              <span class="eval-hash">#</span>
              Evaluation
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-banner
      v-if="ring2PhaseActive && currentJudgeId && ring2SubmissionLocked"
      rounded
      class="bg-green-2 text-dark q-mb-md"
    >
      Odovzdanie poradia je potvrdené. Úpravy sú možné až po odomknutí administrátorom.
    </q-banner>

    <div
      v-if="ring2PhaseActive && currentJudgeId && canConfirmRing2"
      class="bottom-bar q-mt-lg column q-gutter-sm"
    >
      <q-btn
        v-if="!ring2SubmissionLocked"
        unelevated
        color="primary"
        class="full-width ring2-action-btn"
        no-caps
        icon="send"
        label="Odoslať poradie"
        @click="submitRing2Ranking"
      />
    </div>

    <!-- Position Selection Modal -->
    <q-dialog v-model="showModal">
      <q-card class="position-modal">
        <q-card-section class="modal-header">
          <div class="modal-title">Select a position</div>
          <q-btn flat round icon="close" size="sm" @click="closeModal" />
        </q-card-section>

        <q-card-section class="modal-content">
          <!-- Selected Cat Info -->
          <div class="selected-cat-info">
            <q-badge color="dark" class="cat-id-badge">{{ selectedCat?.id }}</q-badge>
            <div class="cat-details">
              <div class="cat-name">{{ selectedCat?.name }}</div>
              <div class="cat-breed">{{ selectedCat?.breed }}</div>
            </div>
          </div>

          <!-- Position Grid -->
          <div class="position-grid" :class="getGridClass()">
            <q-btn
              v-for="pos in cats.length"
              :key="pos"
              :disable="ring2SubmissionLocked"
              :outline="!isPositionAssigned(pos) && !isPositionDuplicate(pos)"
              :unelevated="isPositionAssigned(pos) || isPositionDuplicate(pos)"
              :class="{
                'position-btn': true,
                'position-assigned': isPositionAssigned(pos),
                'position-duplicate': isPositionDuplicate(pos)
              }"
              :label="String(pos)"
              @click="selectPosition(pos)"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import axios from 'axios';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';
import { useCompetitionRealtime } from 'src/composables/useCompetitionRealtime';
import { resolveActingJudgeId } from 'src/utils/acting_judge';
import JudgeSelfStewardStatusChip from 'src/components/JudgeSelfStewardStatusChip.vue';
import {
  advanceSelfStewardCallNext,
  catsInStewardCallOrder,
  type CatCallStatus,
  effectiveCatCallStatus,
  judgingOrderRowForJudgeCat,
  type JudgingOrderLike,
  nextCatCallStatus,
  parseCatCallStatus,
  parseJudgingOrderApiRowStrict,
  protocolGroupTabsForJudge,
  normalizedProtocolGroupKey,
  setOrderProtocolLocal,
} from 'src/utils/cat_steward_cycle';

interface ApiCat {
  id: number;
  registrationNumber: string;
  name: string;
  breed: string;
  group: string;
  sex: string;
  age: string;
  exhibitorId: number | null;
  status: string;
  exhibitor?: { name: string };
}

interface Cat {
  id: string;
  registrationNumber: string;
  name: string;
  breed: string;
  position: number | null;
  status: CatCallStatus;
}

interface Evaluation {
  id: number;
  catId: number;
  judgeId: number | null;
  round: string;
  position: number | null;
  accepted?: boolean | null;
}

interface Judge {
  id: number;
  name: string;
  userId: number | null;
  stewardUserId?: number | null;
  ring2RankingConfirmed?: boolean;
}

const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const competitionId = computed(() => route.params.competitionId as string);

const competitionNumericId = computed(() => {
  const n = Number(competitionId.value);
  return Number.isFinite(n) && n >= 1 ? n : null;
});

useCompetitionRealtime({
  competitionId: competitionNumericId,
  onInvalidate: () => void loadData({ silent: true }),
});



const judgesSnapshot = ref<Judge[]>([]);

const judgeSelfSteward = computed(() => {
  const jid = currentJudgeId.value;
  if (jid == null) return false;
  const j = judgesSnapshot.value.find((x) => x.id === jid);
  return j != null && j.stewardUserId == null;
});

const cats = ref<Cat[]>([]);
const evaluationMap = ref<Map<number, Evaluation>>(new Map());
const currentJudgeId = ref<number | null>(null);
const ring2SubmissionLocked = ref(false);
const showModal = ref(false);
const selectedCat = ref<Cat | null>(null);
const loading = ref(false);
const ring2PhaseActive = ref(false);
const callNextBusy = ref(false);
const judgingOrders = ref<JudgingOrderLike[]>([]);
const selectedRing2ProtocolGroup = ref('');

const ring2ProtocolGroupTabs = computed(() =>
  protocolGroupTabsForJudge(judgingOrders.value, currentJudgeId.value),
);

const ring2ProtocolGroupToggleOptions = computed(() =>
  ring2ProtocolGroupTabs.value.map((o) => ({ label: o.label, value: o.key })),
);

watch(
  [currentJudgeId, ring2ProtocolGroupTabs],
  () => {
    const opts = ring2ProtocolGroupTabs.value;
    if (opts.length === 0) {
      selectedRing2ProtocolGroup.value = '';
      return;
    }
    if (!opts.some((o) => o.key === selectedRing2ProtocolGroup.value)) {
      selectedRing2ProtocolGroup.value = opts[0]!.key;
    }
  },
  { immediate: true },
);

const catsInRing2ProtocolView = computed(() => {
  const jid = currentJudgeId.value;
  if (jid == null || judgingOrders.value.length === 0) return cats.value;
  const tabs = ring2ProtocolGroupTabs.value;
  if (tabs.length <= 1) return cats.value;
  const allowed = new Set(
    judgingOrders.value
      .filter(
        (o) =>
          Number(o.judgeId) === Number(jid) &&
          normalizedProtocolGroupKey(o) === selectedRing2ProtocolGroup.value,
      )
      .map((o) => o.catId),
  );
  return cats.value.filter((c) => allowed.has(Number(c.id)));
});

/** Rovnaké poradie ako u stevarda (filtrované na skupinu). */
const catsCallQueue = computed(() => {
  const tabs = ring2ProtocolGroupTabs.value;
  const filter =
    judgingOrders.value.length > 0 && tabs.length > 1
      ? selectedRing2ProtocolGroup.value
      : null;
  return catsInStewardCallOrder(cats.value, judgingOrders.value, currentJudgeId.value, filter);
});

async function loadData(opts: { silent?: boolean } = {}) {
  if (!competitionId.value) return;
  const silent = opts.silent === true;
  if (!silent) loading.value = true;
  try {
    const { data: comp } = await api.get<{ currentRound: string | null }>(
      `/competitions/${competitionId.value}`,
    );
    ring2PhaseActive.value = comp.currentRound === 'ring2';

    if (!ring2PhaseActive.value) {
      cats.value = [];
      evaluationMap.value = new Map();
      currentJudgeId.value = null;
      ring2SubmissionLocked.value = false;
      judgesSnapshot.value = [];
      judgingOrders.value = [];
      return;
    }

    const [evalsRes, judgesRes, ordersRes] = await Promise.all([
      api.get<Evaluation[]>(`/competitions/${competitionId.value}/evaluations`, { params: { round: 'ring1' } }),
      api.get<Judge[]>(`/competitions/${competitionId.value}/judges`),
      api.get<JudgingOrderLike[]>(`/competitions/${competitionId.value}/judging-orders`),
    ]);
    judgingOrders.value = (ordersRes.data ?? [])
      .map((r) => parseJudgingOrderApiRowStrict(r as Record<string, unknown>) as JudgingOrderLike)
      .filter((o) => Number(o.id) >= 1);
    const judges = judgesRes.data ?? [];
    judgesSnapshot.value = judges;
    const cid = competitionNumericId.value;
    const actingAuth = {
      isAdmin: authStore.isAdmin,
      userId: authStore.user?.id,
      hasCompetitionRole: authStore.hasCompetitionRole.bind(authStore),
    };
    currentJudgeId.value =
      cid != null ? resolveActingJudgeId(route, judges, actingAuth, cid) : null;
    const activeJudge = judges.find((j: Judge) => j.id === currentJudgeId.value);
    ring2SubmissionLocked.value = !!activeJudge?.ring2RankingConfirmed;

    const jid = currentJudgeId.value;
    const evals = (evalsRes.data ?? []).filter((e) => jid === null || e.judgeId === jid);
    const acceptedCatIds = new Set(evals.filter((e) => e.accepted === true).map((e) => e.catId));
    if (acceptedCatIds.size === 0) {
      cats.value = [];
      ring2SubmissionLocked.value = !!activeJudge?.ring2RankingConfirmed;
      return;
    }
    const { data: catsData } = await api.get<ApiCat[]>(`/competitions/${competitionId.value}/cats`);
    const apiCats = (catsData ?? []).filter((c) => acceptedCatIds.has(c.id));

    const ring2Res = await api.get<Evaluation[]>(`/competitions/${competitionId.value}/evaluations`, { params: { round: 'ring2' } });
    const ring2Evals = (ring2Res.data ?? []).filter((e) => jid === null || e.judgeId === jid);
    const ring2Map = new Map<number, Evaluation>();
    ring2Evals.forEach((e) => ring2Map.set(e.catId, e));
    evaluationMap.value = ring2Map;

    cats.value = apiCats.map((c) => ({
      id: String(c.id),
      registrationNumber: c.registrationNumber,
      name: c.name,
      breed: c.breed,
      position: ring2Map.get(c.id)?.position ?? null,
      status: effectiveCatCallStatus(
        judgingOrders.value,
        jid,
        c.id,
        parseCatCallStatus(c.status),
        'ring2',
      ),
    }));
  } catch (err) {
    console.error('Failed to load ring2 data:', err);
  } finally {
    if (!silent) loading.value = false;
  }
}

onMounted(() => {
  void loadData();
});

watch(
  () => route.query.asJudgeId,
  () => {
    void loadData({ silent: true });
  },
);

const sortedCats = computed(() => {
  return [...catsInRing2ProtocolView.value].sort((a, b) => {
    if (a.position && b.position) return a.position - b.position;
    if (a.position && !b.position) return -1;
    if (!a.position && b.position) return 1;
    return a.id.localeCompare(b.id);
  });
});

const unassignedCount = computed(() => {
  return cats.value.filter((c) => !c.position).length;
});

const duplicatePositions = computed(() => {
  const positionCounts: Record<number, number> = {};
  cats.value.forEach((c) => {
    if (c.position) {
      positionCounts[c.position] = (positionCounts[c.position] || 0) + 1;
    }
  });
  return Object.entries(positionCounts)
    .filter(([, count]) => count > 1)
    .map(([pos]) => Number(pos))
    .sort((a, b) => a - b);
});

const canConfirmRing2 = computed(
  () =>
    cats.value.length > 0 &&
    unassignedCount.value === 0 &&
    duplicatePositions.value.length === 0
);

function submitRing2Ranking() {
  if (!competitionId.value || !canConfirmRing2.value || ring2SubmissionLocked.value) return;
  $q.dialog({
    title: 'Odoslať poradie',
    message:
      'Tým potvrdíte odovzdanie poradia v ringu 2. \u010eal\u0161ie \u00fa\u0070\u0072\u0061\u0076\u0079 bud\u00fa mo\u017en\u00e9 a\u017e po odomknut\u00ed administr\u00e1torom.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.post(`/competitions/${competitionId.value}/ring2/complete`, {
          asJudgeId: route.query.asJudgeId ?? undefined,
        });
        ring2SubmissionLocked.value = true;
        $q.notify({ type: 'positive', message: 'Poradie bolo odovzdané.', position: 'top' });
      } catch (err) {
        console.error(err);
        const serverMsg =
          axios.isAxiosError(err) && typeof err.response?.data === 'object' && err.response.data !== null
            ? (err.response.data as { message?: string }).message
            : undefined;
        $q.notify({
          type: 'negative',
          message:
            typeof serverMsg === 'string' && serverMsg.length > 0
              ? serverMsg
              : 'Nepodarilo sa odovzdať poradie.',
          position: 'top',
        });
      }
    })();
  });
}



async function cycleCatCallStatus(cat: Cat) {
  if (!competitionId.value || ring2SubmissionLocked.value) return;
  const next = nextCatCallStatus(cat.status);
  try {
    const ord = judgingOrderRowForJudgeCat(judgingOrders.value, currentJudgeId.value, Number(cat.id));
    if (ord?.id != null && judgingOrders.value.length > 0) {
      await api.put(
        `/competitions/${competitionId.value}/judging-orders/${ord.id}/call-status`,
        { protocolCallStatus: next },
      );
      setOrderProtocolLocal(ord, 'ring2', next);
    } else {
      await api.put(`/competitions/${competitionId.value}/cats/${cat.id}`, { status: next });
    }
    cat.status = next;
  } catch (err) {
    console.error('Failed to update cat status:', err);
    $q.notify({ type: 'negative', message: 'Stav sa nepodarilo uložiť.', position: 'top' });
  }
}

async function selfStewardCallNext() {
  if (!competitionId.value || !judgeSelfSteward.value || ring2SubmissionLocked.value) return;
  callNextBusy.value = true;
  try {
    const steps = await advanceSelfStewardCallNext(catsCallQueue.value, async (cat, s) => {
      const ord = judgingOrderRowForJudgeCat(judgingOrders.value, currentJudgeId.value, Number(cat.id));
      if (ord?.id != null && judgingOrders.value.length > 0) {
        await api.put(
          `/competitions/${competitionId.value}/judging-orders/${ord.id}/call-status`,
          { protocolCallStatus: s },
        );
        setOrderProtocolLocal(ord, 'ring2', s);
      } else {
        await api.put(`/competitions/${competitionId.value}/cats/${cat.id}`, { status: s });
      }
      cat.status = s;
    });
    if (steps === 0) {
      $q.notify({
        type: 'info',
        message:
          'V rade nie je ďalší krok (všetky môžu byť hotové alebo čakajú bez aktívnej volanej / hodnotenia).',
        position: 'top',
      });
    }
  } catch (err) {
    console.error('selfStewardCallNext failed:', err);
    $q.notify({ type: 'negative', message: 'Krok sa nepodarilo uložiť.', position: 'top' });
  } finally {
    callNextBusy.value = false;
  }
}

function openPositionModal(cat: Cat) {
  if (ring2SubmissionLocked.value) return;
  selectedCat.value = cat;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedCat.value = null;
}

function getPositionCount(pos: number): number {
  return cats.value.filter((c) => c.position === pos).length;
}

function isPositionAssigned(pos: number): boolean {
  return getPositionCount(pos) === 1;
}

function isPositionDuplicate(pos: number): boolean {
  return getPositionCount(pos) >= 2;
}

async function selectPosition(pos: number) {
  if (ring2SubmissionLocked.value) {
    closeModal();
    return;
  }
  if (!selectedCat.value || !competitionId.value) {
    closeModal();
    return;
  }
  const catId = Number(selectedCat.value.id);
  const eval_ = evaluationMap.value.get(catId);
  const judgeId = currentJudgeId.value ?? eval_?.judgeId ?? null;
  try {
    if (eval_) {
      await api.put(`/competitions/${competitionId.value}/evaluations/${eval_.id}`, {
        judgeId: eval_.judgeId,
        round: 'ring2',
        position: pos,
        accepted: null,
      });
    } else {
      const { data } = await api.post(`/competitions/${competitionId.value}/evaluations`, {
        catId,
        judgeId,
        round: 'ring2',
        position: pos,
        accepted: null,
      });
      evaluationMap.value.set(catId, data);
    }
    const cat = cats.value.find((c) => c.id === selectedCat.value?.id);
    if (cat) cat.position = pos;
    evaluationMap.value = new Map(evaluationMap.value);
  } catch (err) {
    console.error('Failed to save position:', err);
  }
  closeModal();
}

function getGridClass(): string {
  const count = cats.value.length;
  if (count <= 4) return 'grid-4';
  if (count <= 6) return 'grid-3';
  return 'grid-5';
}
</script>

<style scoped>
.protocol-group-toggle :deep(.q-btn-group) {
  flex-wrap: wrap;
}

.protocol-group-toggle :deep(.q-btn) {
  flex: 1 1 140px;
  min-width: 140px;
}

.page-container {
  padding: 1rem;
  padding-bottom: 5rem;
  max-width: 900px;
  margin: 0 auto;
}

.bottom-bar {
  max-width: 900px;
  margin: 0 auto;
}

.ring2-action-btn {
  border-radius: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  min-height: 44px;
}

.header-card {
  margin-bottom: 1rem;
}

.header-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.call-next-steward-btn {
  border-radius: 0.5rem;
  background: #030213 !important;
  color: #fff !important;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 500;
}

.header-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.warning-banner {
  background-color: #fef3c7 !important;
  border: 1px solid #f59e0b;
  border-radius: 0.5rem;
}

.info-banner {
  background-color: #dbeafe !important;
  border: 1px solid #3b82f6;
  border-radius: 0.5rem;
}

.cats-card {
  margin-bottom: 1rem;
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cat-card {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cat-card--with-steward-chip {
  flex-wrap: wrap;
  padding-top: 4.35rem;
  align-items: flex-start;
}

.cat-card--with-steward-chip .position-badge,
.cat-card--with-steward-chip .cat-info,
.cat-card--with-steward-chip .eval-btn {
  margin-top: 0.45rem;
}

.ring2-self-steward-slot {
  position: absolute;
  top: 0.45rem;
  left: 0.45rem;
  right: 0.45rem;
  z-index: 3;
  box-sizing: border-box;
  pointer-events: none;
}

.ring2-self-steward-slot :deep(.judge-steward-chip) {
  pointer-events: auto;
  width: 100%;
}

.position-badge {
  width: 56px;
  height: 56px;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.position-empty {
  background-color: #f3f4f6;
  color: #9ca3af;
}

.position-gold {
  background-color: #fef3c7;
  color: #d97706;
}

.position-silver {
  background-color: #e5e7eb;
  color: #4b5563;
}

.position-bronze {
  background-color: #fed7aa;
  color: #c2410c;
}

.position-assigned {
  background-color: #e5e7eb;
  color: #374151;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.cat-id-badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.25rem;
}

.cat-details {
  display: flex;
  flex-direction: column;
}

.cat-name {
  font-size: 1rem;
  font-weight: 500;
}

.cat-breed {
  font-size: 0.875rem;
  color: #6b7280;
}

.eval-btn {
  padding: 0.5rem 1rem;
  flex-shrink: 0;
}

.eval-hash {
  font-weight: 700;
  margin-right: 0.25rem;
}

/* Modal Styles */
.position-modal {
  min-width: 320px;
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 500;
}

.modal-content {
  padding-top: 0;
}

.selected-cat-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}

.position-grid.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.position-grid.grid-4 {
  grid-template-columns: repeat(4, 1fr);
}

.position-grid.grid-5 {
  grid-template-columns: repeat(5, 1fr);
}

.position-btn {
  aspect-ratio: 1;
  font-size: 1.125rem;
  font-weight: 500;
}

.position-assigned {
  background-color: #3b82f6 !important;
  color: white !important;
}

.position-duplicate {
  border: 2px solid #f59e0b !important;
  background-color: #fef3c7 !important;
  color: #92400e !important;
}
</style>
