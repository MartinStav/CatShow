<template>
  <q-page class="page-container">
    <!-- Header Card -->
    <q-card class="header-card">
      <q-card-section class="header-content">
        <div class="header-title">
          <q-icon name="notifications" size="24px" />
          <span>Ring - Phase 1</span>
        </div>
        <div class="status-badges">
          <q-badge color="green" class="status-badge">
            Accepted: {{ acceptedCats.length }}
          </q-badge>
          <q-badge color="red" class="status-badge">
            Rejected: {{ disqualifiedCats.length }}
          </q-badge>
          <q-badge outline color="grey-8" class="status-badge">
            Waiting: {{ waitingCats.length }}
          </q-badge>
        </div>
        <div
          v-if="
            !loading &&
            ring1PhaseActive &&
            currentJudgeId &&
            judgeSelfSteward &&
            allCats.length > 0 &&
            !ring1SubmissionLocked
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
            ring1PhaseActive &&
            currentJudgeId &&
            ring1ProtocolGroupTabs.length > 1 &&
            judgingOrders.length > 0
          "
          v-model="selectedRing1ProtocolGroup"
          :options="ring1ProtocolGroupToggleOptions"
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
      v-if="!loading && !ring1PhaseActive"
      rounded
      class="bg-orange-2 text-dark q-mb-md"
    >
      Ring 1 (prijatie / zamietnutie) ešte nie je spustený.
    </q-banner>

    <q-banner
      v-if="!loading && ring1PhaseActive && !currentJudgeId"
      rounded
      class="bg-red-2 text-dark q-mb-md"
    >
      Nemáte priradený záznam rozhodcu v tejto súťaži. Kontaktujte administrátora.
    </q-banner>

    <q-banner
      v-if="!loading && ring1PhaseActive && currentJudgeId && ring1SubmissionLocked"
      rounded
      class="bg-green-2 text-dark q-mb-md"
    >
      Ring 1 je odovzdaný. Po spustení Ring 2 vás aplikácia presmeruje na hodnotenie poradia.
    </q-banner>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-lg">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Waiting for Judging Section -->
    <q-card v-if="!loading && ring1PhaseActive && currentJudgeId && waitingCats.length > 0" class="section-card">
      <q-card-section>
        <div class="section-title">Waiting for judging</div>
        <div class="cat-list">
          <div
            v-for="cat in waitingCats"
            :key="cat.id"
            class="waiting-cat-card"
            :class="{ 'waiting-cat-card--with-steward-chip': judgeSelfSteward }"
          >
            <div v-if="judgeSelfSteward" class="ring1-self-steward-slot">
              <JudgeSelfStewardStatusChip :status="cat.status" @cycle="cycleCatCallStatus(cat)" />
            </div>
            <div class="cat-info">
              <q-badge color="dark" class="cat-id-badge">{{ cat.registrationNumber }}</q-badge>
              <div class="cat-details">
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-breed">{{ cat.breed }}</div>
              </div>
            </div>
            <div class="cat-actions">
              <q-btn
                outline
                color="red"
                class="action-btn reject-btn"
                :disable="ring1SubmissionLocked"
                @click="rejectCat(cat)"
              >
                <q-icon name="cancel" size="18px" class="q-mr-xs" />
                Reject
              </q-btn>
              <q-btn
                unelevated
                color="green"
                class="action-btn accept-btn"
                :disable="ring1SubmissionLocked"
                @click="acceptCat(cat)"
              >
                <q-icon name="check_circle" size="18px" class="q-mr-xs" />
                Accept
              </q-btn>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Accepted Cats Section -->
    <q-card v-if="!loading && ring1PhaseActive && currentJudgeId && acceptedCats.length > 0" class="section-card">
      <q-card-section>
        <div class="section-title section-title-green">
          Accepted cats ({{ acceptedCats.length }})
        </div>
        <div class="cat-list">
          <div
            v-for="cat in acceptedCats"
            :key="cat.id"
            class="sorted-cat-card accepted-border"
            :class="{ 'sorted-cat-card--with-steward-chip': judgeSelfSteward }"
          >
            <div v-if="judgeSelfSteward" class="ring1-self-steward-slot">
              <JudgeSelfStewardStatusChip :status="cat.status" @cycle="cycleCatCallStatus(cat)" />
            </div>
            <div class="cat-info">
              <q-badge color="green" class="cat-id-badge">{{ cat.registrationNumber }}</q-badge>
              <div class="cat-details">
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-breed">{{ cat.breed }}</div>
              </div>
            </div>
            <q-btn
              outline
              color="red"
              size="sm"
              class="action-btn-small"
              :disable="ring1SubmissionLocked"
              @click="rejectCat(cat)"
            >
              <q-icon name="cancel" size="16px" class="q-mr-xs" />
              Reject
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Disqualified Cats Section -->
    <q-card v-if="!loading && ring1PhaseActive && currentJudgeId && disqualifiedCats.length > 0" class="section-card">
      <q-card-section>
        <div class="section-title section-title-red">
          Disqualified cats ({{ disqualifiedCats.length }})
        </div>
        <div class="cat-list">
          <div
            v-for="cat in disqualifiedCats"
            :key="cat.id"
            class="sorted-cat-card rejected-border"
            :class="{ 'sorted-cat-card--with-steward-chip': judgeSelfSteward }"
          >
            <div v-if="judgeSelfSteward" class="ring1-self-steward-slot">
              <JudgeSelfStewardStatusChip :status="cat.status" @cycle="cycleCatCallStatus(cat)" />
            </div>
            <div class="cat-info">
              <q-badge color="red" class="cat-id-badge">{{ cat.registrationNumber }}</q-badge>
              <div class="cat-details">
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-breed">{{ cat.breed }}</div>
              </div>
            </div>
            <q-btn
              outline
              color="green"
              size="sm"
              class="action-btn-small"
              :disable="ring1SubmissionLocked"
              @click="acceptCat(cat)"
            >
              <q-icon name="check_circle" size="16px" class="q-mr-xs" />
              Accept
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Odovzdanie Ring 1 – bez presmerovania; Ring 2 až po zmene kola v administrácii -->
    <div
      v-if="ring1PhaseActive && currentJudgeId && allCatsSorted && !ring1SubmissionLocked"
      class="bottom-bar"
    >
      <q-btn
        unelevated
        color="green"
        size="lg"
        class="proceed-btn"
        :loading="ring1ConfirmBusy"
        @click="confirmRing1SubmissionDialog"
      >
        <q-icon name="check_circle" size="20px" class="q-mr-sm" />
        Potvrdiť odovzdanie Ring 1
      </q-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
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
  status: CatCallStatus;
}

interface Evaluation {
  id: number;
  catId: number;
  judgeId: number | null;
  round: string;
  grade?: string | null;
  accepted: boolean | null;
}

interface Judge {
  id: number;
  name: string;
  userId: number | null;
  stewardUserId?: number | null;
  ring1RankingConfirmed?: boolean;
}

const route = useRoute();
const competitionId = computed(() => route.params.competitionId as string);

const competitionNumericId = computed(() => {
  const n = Number(competitionId.value);
  return Number.isFinite(n) && n >= 1 ? n : null;
});

useCompetitionRealtime({
  competitionId: competitionNumericId,
  onInvalidate: () => void loadData({ silent: true }),
});

const authStore = useAuthStore();
const $q = useQuasar();
const allCats = ref<Cat[]>([]);
const evaluationMap = ref<Map<number, Evaluation>>(new Map());
const currentJudgeId = ref<number | null>(null);
const loading = ref(false);
const ring1PhaseActive = ref(false);
const ring1SubmissionLocked = ref(false);
const ring1ConfirmBusy = ref(false);
const callNextBusy = ref(false);
const judgesSnapshot = ref<Judge[]>([]);
const judgingOrders = ref<JudgingOrderLike[]>([]);
const selectedRing1ProtocolGroup = ref('');

const ring1ProtocolGroupTabs = computed(() =>
  protocolGroupTabsForJudge(judgingOrders.value, currentJudgeId.value),
);

const ring1ProtocolGroupToggleOptions = computed(() =>
  ring1ProtocolGroupTabs.value.map((o) => ({ label: o.label, value: o.key })),
);

watch(
  [currentJudgeId, ring1ProtocolGroupTabs],
  () => {
    const opts = ring1ProtocolGroupTabs.value;
    if (opts.length === 0) {
      selectedRing1ProtocolGroup.value = '';
      return;
    }
    if (!opts.some((o) => o.key === selectedRing1ProtocolGroup.value)) {
      selectedRing1ProtocolGroup.value = opts[0]!.key;
    }
  },
  { immediate: true },
);

/** Mačky viditeľné podľa aktivnej skupiny judge protokolu (alebo všetky, ak jedna skupina / bez protokolu). */
const allCatsInProtocolView = computed(() => {
  const jid = currentJudgeId.value;
  if (jid == null || judgingOrders.value.length === 0) return allCats.value;
  const tabs = ring1ProtocolGroupTabs.value;
  if (tabs.length <= 1) return allCats.value;
  const allowed = new Set(
    judgingOrders.value
      .filter(
        (o) =>
          Number(o.judgeId) === Number(jid) &&
          normalizedProtocolGroupKey(o) === selectedRing1ProtocolGroup.value,
      )
      .map((o) => o.catId),
  );
  return allCats.value.filter((c) => allowed.has(Number(c.id)));
});

const judgeSelfSteward = computed(() => {
  const jid = currentJudgeId.value;
  if (jid == null) return false;
  const j = judgesSnapshot.value.find((x) => x.id === jid);
  return j != null && j.stewardUserId == null;
});

const waitingCats = computed(() => {
  return allCatsInProtocolView.value.filter((c) => {
    const eval_ = evaluationMap.value.get(Number(c.id));
    return eval_?.accepted === null || eval_?.accepted === undefined;
  });
});

const acceptedCats = computed(() => {
  return allCatsInProtocolView.value.filter((c) => {
    const eval_ = evaluationMap.value.get(Number(c.id));
    return eval_?.accepted === true;
  });
});

const disqualifiedCats = computed(() => {
  return allCatsInProtocolView.value.filter((c) => {
    const eval_ = evaluationMap.value.get(Number(c.id));
    return eval_?.accepted === false;
  });
});

const allCatsSorted = computed(() => {
  const pending = allCats.value.filter((c) => {
    const eval_ = evaluationMap.value.get(Number(c.id));
    return eval_?.accepted === null || eval_?.accepted === undefined;
  });
  return pending.length === 0;
});

/** Rovnaké poradie ako u stevarda (filtrované na skupinu). */
const catsCallQueue = computed(() => {
  const tabs = ring1ProtocolGroupTabs.value;
  const filter =
    judgingOrders.value.length > 0 && tabs.length > 1
      ? selectedRing1ProtocolGroup.value
      : null;
  return catsInStewardCallOrder(allCats.value, judgingOrders.value, currentJudgeId.value, filter);
});

const loadData = async (opts: { silent?: boolean } = {}) => {
  if (!competitionId.value) return;
  const silent = opts.silent === true;
  if (!silent) loading.value = true;
  try {
    const { data: comp } = await api.get<{ currentRound: string | null }>(
      `/competitions/${competitionId.value}`,
    );
    ring1PhaseActive.value = comp.currentRound === 'ring1';

    if (!ring1PhaseActive.value) {
      allCats.value = [];
      evaluationMap.value = new Map();
      currentJudgeId.value = null;
      judgesSnapshot.value = [];
      judgingOrders.value = [];
      ring1SubmissionLocked.value = false;
      return;
    }

    const [catsRes, evalsRes, judgesRes, ordersRes] = await Promise.all([
      api.get<ApiCat[]>(`/competitions/${competitionId.value}/cats`),
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
    ring1SubmissionLocked.value = !!activeJudge?.ring1RankingConfirmed;
    const [nominationRes, gradesRes] = await Promise.all([
      api.get<Evaluation[]>(`/competitions/${competitionId.value}/evaluations`, {
        params: { round: 'nomination' },
      }),
      api.get<Array<{ code: string; countsAsAccepted: boolean }>>(
        `/competitions/${competitionId.value}/grades`,
      ),
    ]);
    const acceptedGradeCodes = new Set(
      (gradesRes.data ?? [])
        .filter((g) => g.countsAsAccepted)
        .map((g) => (g.code ?? '').trim())
        .filter((code) => code.length > 0),
    );
    if (acceptedGradeCodes.size === 0) {
      acceptedGradeCodes.add('EX1');
      acceptedGradeCodes.add('EX2');
      acceptedGradeCodes.add('EX3');
    }
    const jid = currentJudgeId.value;
    const nominationEvals = (nominationRes.data ?? []).filter(
      (e) =>
        (jid === null || e.judgeId === jid) &&
        typeof e.grade === 'string' &&
        acceptedGradeCodes.has(e.grade.trim()),
    );
    const eligibleCatIds = new Set(nominationEvals.map((e) => e.catId));

    const apiCats = (catsRes.data ?? []).filter((c) => eligibleCatIds.has(Number(c.id)));
    allCats.value = apiCats.map((c) => ({
      id: String(c.id),
      registrationNumber: c.registrationNumber,
      name: c.name,
      breed: c.breed,
      status: effectiveCatCallStatus(
        judgingOrders.value,
        jid,
        Number(c.id),
        parseCatCallStatus(c.status),
        'ring1',
      ),
    }));
    const evals = (evalsRes.data ?? []).filter((e) => jid === null || e.judgeId === jid);
    const map = new Map<number, Evaluation>();
    evals.forEach((e) => map.set(e.catId, e));
    evaluationMap.value = map;
  } catch (err) {
    console.error('Failed to load ring data:', err);
  } finally {
    if (!silent) loading.value = false;
  }
};

onMounted(() => {
  void loadData();
});

watch(
  () => route.query.asJudgeId,
  () => {
    void loadData({ silent: true });
  },
);

async function updateEvaluation(catId: number, accepted: boolean) {
  if (ring1SubmissionLocked.value) return;
  const eval_ = evaluationMap.value.get(catId);
  if (!competitionId.value) return;
  const judgeId = currentJudgeId.value ?? eval_?.judgeId ?? null;
  try {
    if (eval_) {
      await api.put(`/competitions/${competitionId.value}/evaluations/${eval_.id}`, {
        judgeId: eval_.judgeId,
        round: 'ring1',
        accepted,
        position: null,
      });
      eval_.accepted = accepted;
    } else {
      const { data } = await api.post(`/competitions/${competitionId.value}/evaluations`, {
        catId,
        judgeId,
        round: 'ring1',
        accepted,
        position: null,
      });
      evaluationMap.value.set(catId, data);
    }
    evaluationMap.value = new Map(evaluationMap.value);
  } catch (err) {
    console.error('Failed to update evaluation:', err);
  }
}

function acceptCat(cat: Cat) {
  void updateEvaluation(Number(cat.id), true);
}

function rejectCat(cat: Cat) {
  void updateEvaluation(Number(cat.id), false);
}

function confirmRing1SubmissionDialog() {
  if (ring1SubmissionLocked.value || !allCatsSorted.value || !competitionId.value) return;
  $q.dialog({
    title: 'Potvrdiť Ring 1',
    message:
      'Uložíte odovzdanie prijatia / zamietnutia pre Ring 1. Ďalšie úpravy bude môcť urobiť len administrátor (odomknutie). Ring 2 otvoríte až po tom, čo administrátor prepne aktuálne kolo súťaže na Ring 2.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void submitRing1Complete();
  });
}

async function submitRing1Complete() {
  if (!competitionId.value || ring1ConfirmBusy.value) return;
  ring1ConfirmBusy.value = true;
  try {
    await api.post(`/competitions/${competitionId.value}/ring1/complete`, {
      asJudgeId: route.query.asJudgeId ?? undefined,
    });
    ring1SubmissionLocked.value = true;
    await loadData({ silent: true });
    $q.notify({
      type: 'positive',
      message: 'Ring 1 bol odovzdaný. Čakajte na prepnutie kola na Ring 2 v administrácii.',
      position: 'top',
    });
  } catch (err: unknown) {
    const data = typeof err === 'object' && err !== null && 'response' in err ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
    const msg = typeof data?.message === 'string' ? data.message : 'Ring 1 sa nepodarilo odovzdať.';
    $q.notify({ type: 'negative', message: msg, position: 'top' });
  } finally {
    ring1ConfirmBusy.value = false;
  }
}

async function cycleCatCallStatus(cat: Cat) {
  if (ring1SubmissionLocked.value) return;
  if (!competitionId.value) return;
  const next = nextCatCallStatus(cat.status);
  try {
    const ord = judgingOrderRowForJudgeCat(judgingOrders.value, currentJudgeId.value, Number(cat.id));
    if (ord?.id != null && judgingOrders.value.length > 0) {
      await api.put(
        `/competitions/${competitionId.value}/judging-orders/${ord.id}/call-status`,
        { protocolCallStatus: next },
      );
      setOrderProtocolLocal(ord, 'ring1', next);
    } else {
      await api.put(`/competitions/${competitionId.value}/cats/${cat.id}`, { status: next });
    }
    cat.status = next;
  } catch (err: unknown) {
    console.error('Failed to update cat status:', err);
    const data =
      typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: unknown } } }).response?.data
        : undefined;
    const msg =
      typeof data?.message === 'string' && data.message.length > 0
        ? data.message
        : 'Stav sa nepodarilo uložiť.';
    $q.notify({ type: 'negative', message: msg, position: 'top' });
  }
}

async function selfStewardCallNext() {
  if (!competitionId.value || !judgeSelfSteward.value || ring1SubmissionLocked.value) return;
  callNextBusy.value = true;
  try {
    const steps = await advanceSelfStewardCallNext(catsCallQueue.value, async (cat, s) => {
      const ord = judgingOrderRowForJudgeCat(judgingOrders.value, currentJudgeId.value, Number(cat.id));
      if (ord?.id != null && judgingOrders.value.length > 0) {
        await api.put(
          `/competitions/${competitionId.value}/judging-orders/${ord.id}/call-status`,
          { protocolCallStatus: s },
        );
        setOrderProtocolLocal(ord, 'ring1', s);
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
  padding-bottom: 100px;
  max-width: 900px;
  margin: 0 auto;
}

.header-card {
  margin-bottom: 1rem;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
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
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 500;
}

.status-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.status-badge {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 1rem;
}

.section-card {
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  margin-bottom: 1rem;
}

.section-title-green {
  color: #00c950;
}

.section-title-red {
  color: #e53935;
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.waiting-cat-card {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.waiting-cat-card--with-steward-chip {
  padding-top: 4.2rem;
}

.waiting-cat-card--with-steward-chip .cat-info {
  margin-top: 0.45rem;
}

.sorted-cat-card {
  position: relative;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sorted-cat-card--with-steward-chip {
  padding-top: 4.2rem;
}

.sorted-cat-card--with-steward-chip .cat-info,
.sorted-cat-card--with-steward-chip > .action-btn-small {
  margin-top: 0.45rem;
}

.ring1-self-steward-slot {
  position: absolute;
  top: 0.45rem;
  left: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  box-sizing: border-box;
  pointer-events: none;
}

.ring1-self-steward-slot :deep(.judge-steward-chip) {
  pointer-events: auto;
  width: 100%;
}

.accepted-border {
  border: 1px solid #00c950;
  border-left: 4px solid #00c950;
}

.rejected-border {
  border: 1px solid #e53935;
  border-left: 4px solid #e53935;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.cat-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  padding: 0.5rem 1rem;
}

.reject-btn {
  border-color: #e53935;
  color: #e53935;
}

.accept-btn {
  background-color: #00c950 !important;
}

.action-btn-small {
  padding: 0.25rem 0.75rem;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 2px solid #00c950;
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.proceed-btn {
  width: 100%;
  max-width: 400px;
  background-color: #00c950 !important;
  font-weight: 500;
}
</style>
