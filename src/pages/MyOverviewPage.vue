<template>
  <q-page class="q-pa-lg">
    <div class="page-wrapper">
      <!-- Header -->
      <div class="row items-start justify-between q-mb-lg">
        <div>
          <div class="page-title">My Overview</div>
          <div class="page-subtitle">{{ exhibitorName || 'Loading...' }}</div>
        </div>
        <q-badge color="dark" class="round-badge">
          Preliminary Round
        </q-badge>
      </div>

      <q-banner
        v-if="showPushBanner"
        rounded
        class="bg-blue-1 text-dark q-mb-md"
      >
        Zapnite si notifikácie, aby vám prišla informácia o zmene stavu mačky aj keď máte stránku zatvorenú.
        <template v-slot:action>
          <q-btn
            flat
            no-caps
            color="primary"
            label="Zapnúť notifikácie"
            :loading="pushBusy"
            @click="enablePushNotifications"
          />
        </template>
      </q-banner>

      <!-- Loading -->
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner-dots color="primary" size="40px" />
      </div>

      <!-- Summary Cards & Cat Cards -->
      <template v-else>
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-sm-6">
            <q-card class="summary-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="summary-label">My Cats</div>
                  <q-icon name="emoji_events" size="20px" color="grey-6" />
                </div>
                <div class="summary-number">{{ myCats.length }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6">
            <q-card class="summary-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="summary-label">Completed</div>
                  <q-icon name="emoji_events" size="20px" color="grey-6" />
                </div>
                <div class="summary-number">{{ completedCount }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Cat Cards -->
        <div class="row q-col-gutter-md items-stretch">
        <div
          v-for="cat in myCats"
          :key="cat.id"
          class="col-12 col-md-6"
        >
          <q-card class="cat-card full-height" :class="getCardBorderClass(cat.status)">
            <q-card-section class="column full-height">
              <!-- Header -->
              <div class="row items-start justify-between q-mb-md">
                <div>
                  <div class="cat-name">{{ cat.name }}</div>
                  <div class="cat-breed">{{ cat.breed }}</div>
                </div>
                <q-badge
                  :color="getStatusColor(cat.status)"
                  :outline="cat.status === 'Waiting'"
                  :text-color="cat.status === 'Waiting' ? 'grey-8' : 'white'"
                  class="status-badge"
                >
                  <q-icon v-if="cat.status === 'Waiting'" name="schedule" size="12px" class="q-mr-xs" />
                  {{ cat.status }}
                </q-badge>
              </div>

              <!-- Details Grid -->
              <div class="details-grid q-mb-md">
                <div class="detail-row">
                  <div class="detail-label">Trieda:</div>
                  <q-badge outline color="grey-8" class="detail-badge">{{ cat.competitionClass }}</q-badge>
                </div>
                <div class="detail-row">
                  <div class="detail-label">Sex:</div>
                  <div class="detail-value">{{ cat.gender }}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">Age:</div>
                  <div class="detail-value">{{ cat.age }}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">Reg. No.:</div>
                  <div class="detail-value">{{ cat.registration }}</div>
                </div>
              </div>
              <div v-if="cat.breedGroup" class="detail-row-extra text-caption text-grey-7">
                Skupina: {{ cat.breedGroup }}
              </div>

              <div class="detail-row-extra q-mt-sm">
                <div class="detail-label">Vyvolanie (podľa kola)</div>
                <div class="text-caption text-grey-8 q-mt-xs">
                  <div>Nominácia: <strong>{{ phaseCallSk(cat.phaseCalls.nomination) }}</strong></div>
                  <div>Ring 1: <strong>{{ phaseCallSk(cat.phaseCalls.ring1) }}</strong></div>
                  <div>Ring 2: <strong>{{ phaseCallSk(cat.phaseCalls.ring2) }}</strong></div>
                </div>
              </div>

              <!-- Alert Banner -->
              <div v-if="cat.alert" class="alert-banner q-mb-md">
                <q-icon name="warning" size="16px" class="q-mr-sm" />
                {{ cat.alert }}
              </div>

              <!-- Location Cards -->
              <div v-if="cat.locations && cat.locations.length > 0" class="locations q-mb-md">
                <div
                  v-for="loc in cat.locations"
                  :key="loc.key"
                  class="location-card"
                  :class="getLocationStatusClass(loc.callStatus)"
                >
                  <div class="location-type">{{ loc.headline }}</div>
                  <div class="location-table">Stôl: <strong>{{ loc.table }}</strong></div>
                  <div class="location-time">Stav: {{ loc.statusLabel }}</div>
                </div>
              </div>

              <div class="col-grow"></div>

              <!-- Správa -->
              <div v-if="cat.message" class="message-banner" :class="getMessageClass(cat.status)">
                <q-icon :name="getMessageIcon(cat.status)" size="24px" class="q-mr-sm" />
                <span>{{ cat.message }}</span>
              </div>

              <!-- Výsledky (nominácia, ring 1, ring 2) – všetci sudcovia -->
              <div
                v-if="
                  cat.nominationRows.length > 0 ||
                  cat.ring1Rows.length > 0 ||
                  cat.ring2Rows.length > 0
                "
                class="results-section q-mt-md"
              >
                <div class="text-caption text-weight-medium text-grey-8 q-mb-xs">Výsledky</div>

                <div v-if="cat.nominationRows.length > 0" class="q-mb-sm">
                  <div class="detail-label">Nominácia</div>
                  <div
                    v-for="(row, idx) in cat.nominationRows"
                    :key="`${cat.id}-nom-${idx}-${row.judgeName}`"
                    class="exhibitor-eval-block q-mt-xs"
                  >
                    <div class="text-caption text-weight-medium text-grey-8">{{ row.judgeName }}</div>
                    <div class="row items-center q-gutter-xs q-mt-xs wrap">
                      <template v-if="row.grade">
                        <q-badge color="dark" class="detail-badge">{{ row.grade }}</q-badge>
                        <q-badge
                          v-for="t in row.titles"
                          :key="t"
                          outline
                          color="grey-8"
                        >
                          {{ t }}
                        </q-badge>
                        <q-badge v-if="row.nomBis" color="amber" text-color="dark">NomBIS</q-badge>
                      </template>
                      <span v-else class="text-caption text-grey-6">Hodnotenie ešte nie je zadané.</span>
                    </div>
                  </div>
                </div>

                <div v-if="cat.ring1Rows.length > 0" class="q-mb-sm">
                  <div class="detail-label">Ring 1</div>
                  <div
                    v-for="(row, idx) in cat.ring1Rows"
                    :key="`${cat.id}-r1-${idx}-${row.judgeName}`"
                    class="exhibitor-eval-block q-mt-xs"
                  >
                    <div class="text-caption text-weight-medium text-grey-8">{{ row.judgeName }}</div>
                    <q-badge
                      v-if="row.accepted !== null && row.accepted !== undefined"
                      :color="row.accepted ? 'green' : 'red'"
                      :outline="!row.accepted"
                      class="q-mt-xs"
                    >
                      {{ row.accepted ? 'Prijatá do ringu' : 'Nebola prijatá' }}
                    </q-badge>
                    <span v-else class="text-caption text-grey-6 q-mt-xs inline-block">
                      Čaká na rozhodnutie.
                    </span>
                  </div>
                </div>

                <div v-if="cat.ring2Rows.length > 0">
                  <div class="detail-label">Ring 2 – poradie</div>
                  <div
                    v-for="(row, idx) in cat.ring2Rows"
                    :key="`${cat.id}-r2-${idx}-${row.judgeName}`"
                    class="exhibitor-eval-block q-mt-xs"
                  >
                    <div class="text-caption text-weight-medium text-grey-8">{{ row.judgeName }}</div>
                    <div v-if="row.position != null" class="result-position q-mt-xs">
                      <q-icon name="emoji_events" size="16px" color="amber" class="q-mr-xs" />
                      miesto: <strong>#{{ row.position }}</strong>
                    </div>
                    <span v-else class="text-caption text-grey-6 q-mt-xs inline-block">
                      Poradie ešte nie je zapísané.
                    </span>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';
import { useCompetitionRealtime } from 'src/composables/useCompetitionRealtime';
import { compareJudgingOrders, type JudgingOrderLike } from 'src/utils/cat_steward_cycle';

type ApiCallStatus = 'waiting' | 'called' | 'judging' | 'completed';
type ProtocolPhaseKey = 'nomination' | 'ring1' | 'ring2';

interface Location {
  key: string;
  headline: string;
  table: number;
  statusLabel: string;
  callStatus: 'called' | 'judging';
}

interface JudgingOrderRow {
  id: number;
  catId: number;
  tableNumber: number;
  orderPosition: number;
  protocolGroup: string;
  protocolCallStatus?: string;
  ring1ProtocolCallStatus?: string;
  ring2ProtocolCallStatus?: string;
  judge?: { name: string };
}

function normalizeJudgingOrderRow(raw: unknown): JudgingOrderRow {
  const r = raw as Record<string, unknown>;
  const j = r.judge;
  const pick = (camel: unknown, snake: unknown): string | undefined => {
    if (typeof camel === 'string') return camel;
    if (typeof snake === 'string') return snake;
    return undefined;
  };
  const ps = pick(r.protocolCallStatus, r.protocol_call_status);
  const ps1 = pick(r.ring1ProtocolCallStatus, r.ring1_protocol_call_status);
  const ps2 = pick(r.ring2ProtocolCallStatus, r.ring2_protocol_call_status);
  const judge =
    j && typeof j === 'object' && j !== null && typeof (j as { name?: unknown }).name === 'string'
      ? { name: (j as { name: string }).name }
      : undefined;

  const pgraw = r.protocolGroup;
  let protocolGroup = '';
  if (typeof pgraw === 'string' && pgraw.trim()) protocolGroup = pgraw.trim();

  const row: JudgingOrderRow = {
    id: Number(r.id),
    catId: Number(r.catId),
    tableNumber: Number(r.tableNumber ?? 1),
    orderPosition: Number(r.orderPosition ?? 0),
    protocolGroup,
  };
  if (ps !== undefined) row.protocolCallStatus = ps;
  if (ps1 !== undefined) row.ring1ProtocolCallStatus = ps1;
  if (ps2 !== undefined) row.ring2ProtocolCallStatus = ps2;
  if (judge !== undefined) row.judge = judge;
  return row;
}

function parseCallStatusRaw(s: string | undefined): ApiCallStatus {
  const v = (s ?? 'waiting').toLowerCase();
  if (v === 'called' || v === 'judging' || v === 'completed' || v === 'waiting') return v;
  return 'waiting';
}

function orderStatusForPhase(o: JudgingOrderRow, phase: ProtocolPhaseKey): ApiCallStatus {
  const raw =
    phase === 'nomination'
      ? o.protocolCallStatus
      : phase === 'ring1'
        ? o.ring1ProtocolCallStatus
        : o.ring2ProtocolCallStatus;
  return parseCallStatusRaw(raw);
}

function exhibitorAggregatePhase(
  catId: number,
  catDbStatus: string,
  orders: JudgingOrderRow[],
  phase: ProtocolPhaseKey,
): ApiCallStatus {
  const rows = orders.filter((o) => o.catId === catId);
  if (rows.length === 0) {
    return phase === 'nomination' ? parseCallStatusRaw(catDbStatus) : 'waiting';
  }
  const statuses = rows.map((o) => orderStatusForPhase(o, phase));
  if (statuses.some((x) => x === 'judging')) return 'judging';
  if (statuses.some((x) => x === 'called')) return 'called';
  if (statuses.every((x) => x === 'completed')) return 'completed';
  return 'waiting';
}

function badgePhaseFromCompRound(round: string | null): ProtocolPhaseKey {
  if (round === 'ring2') return 'ring2';
  if (round === 'ring1') return 'ring1';
  return 'nomination';
}

function protocolPhaseFromCompRound(round: string | null): ProtocolPhaseKey | null {
  if (round === 'nomination') return 'nomination';
  if (round === 'ring1') return 'ring1';
  if (round === 'ring2') return 'ring2';
  return null;
}

function phaseCallSk(s: ApiCallStatus): string {
  switch (s) {
    case 'waiting':
      return 'Čaká';
    case 'called':
      return 'Volaná';
    case 'judging':
      return 'Hodnotí sa';
    case 'completed':
      return 'Hotovo';
    default:
      return s;
  }
}

function callStatusSortRank(s: ApiCallStatus): number {
  if (s === 'judging') return 0;
  if (s === 'called') return 1;
  return 2;
}

function buildLocationsForCat(
  catId: number,
  orders: JudgingOrderRow[],
  competitionRound: string | null,
): Location[] | undefined {
  const protocolPhase = protocolPhaseFromCompRound(competitionRound);
  if (!protocolPhase) return undefined;

  const rows = orders.filter((o) => {
    if (o.catId !== catId) return false;
    const s = orderStatusForPhase(o, protocolPhase);
    return s === 'called' || s === 'judging';
  });
  if (rows.length === 0) return undefined;

  return [...rows]
    .sort((a, b) => {
      const ra = callStatusSortRank(orderStatusForPhase(a, protocolPhase));
      const rb = callStatusSortRank(orderStatusForPhase(b, protocolPhase));
      if (ra !== rb) return ra - rb;
      const ja: JudgingOrderLike = {
        judgeId: 0,
        catId: a.catId,
        tableNumber: a.tableNumber,
        orderPosition: a.orderPosition,
        protocolGroup: a.protocolGroup.length > 0 ? a.protocolGroup : null,
      };
      const jb: JudgingOrderLike = {
        judgeId: 0,
        catId: b.catId,
        tableNumber: b.tableNumber,
        orderPosition: b.orderPosition,
        protocolGroup: b.protocolGroup.length > 0 ? b.protocolGroup : null,
      };
      return compareJudgingOrders(ja, jb);
    })
    .map((o) => {
      const st = orderStatusForPhase(o, protocolPhase);
      const judge = o.judge?.name?.trim();
      const judgePart = judge && judge.length > 0 ? judge : 'Rozhodca';

      let headline: string;
      let statusLabel: string;
      if (protocolPhase === 'nomination') {
        headline = `Nominácia – ${judgePart}`;
        statusLabel = st === 'judging' ? 'Hodnotí sa' : 'Zavolaná';
      } else if (protocolPhase === 'ring1') {
        headline = `Ring 1 – ${judgePart}`;
        statusLabel = st === 'judging' ? 'Hodnotí sa pri stole' : 'Zavolaná na stôl';
      } else {
        headline = `Ring 2 – ${judgePart}`;
        statusLabel = st === 'judging' ? 'Hodnotí sa pri stole' : 'Zavolaná na stôl';
      }

      const key =
        Number.isFinite(o.id) && o.id > 0
          ? `jo-${o.id}`
          : `jo-fallback-${catId}-${o.tableNumber}-${o.orderPosition}`;

      return {
        key,
        headline,
        table: o.tableNumber,
        statusLabel,
        callStatus: st === 'judging' ? 'judging' : 'called',
      };
    });
}

interface NominationExhibitorRow {
  judgeName: string;
  grade: string | null;
  titles: string[];
  nomBis: boolean;
}

interface Ring1ExhibitorRow {
  judgeName: string;
  accepted: boolean | null;
}

interface Ring2ExhibitorRow {
  judgeName: string;
  position: number | null;
}

interface Cat {
  id: string;
  name: string;
  breed: string;
  /** Súťažná trieda (OPEN, Šampiónska, …) – z API poľa `class`. */
  competitionClass: string;
  /** WCF skupina (III, IV…) – nepovinná, len ak nie je prázdna. */
  breedGroup?: string;
  gender: string;
  age: string;
  registration: string;
  status: 'Called' | 'Being Judged' | 'Waiting' | 'Completed';
  alert?: string;
  locations?: Location[];
  message?: string;
  /** Všetky nominácie sudcov (rovnaká mačka môže byť u viacerých sudcov). */
  nominationRows: NominationExhibitorRow[];
  ring1Rows: Ring1ExhibitorRow[];
  ring2Rows: Ring2ExhibitorRow[];
  /** Agregovaný stav vyvolania (judge protokol) — nominácia / ring 1 / ring 2 samostatne. */
  phaseCalls: { nomination: ApiCallStatus; ring1: ApiCallStatus; ring2: ApiCallStatus };
}

interface ApiCat {
  id: number;
  registrationNumber: string;
  name: string;
  breed: string;
  group: string;
  /** API často posiela hlavnú skupinu tu; `group` môže byť prázdne. */
  groups?: string[];
  sex: string;
  age: string;
  exhibitorId: number | null;
  status: string;
  exhibitor?: { name: string };
  /** Voľný text triedy súťaže (OPEN, Šampiónska, …); Lucid má `serializeAs: 'class'`. */
  'class'?: string | null;
}

interface Exhibitor {
  id: number;
  name: string;
  userId: number | null;
}

interface Evaluation {
  id: number;
  catId: number;
  round: string;
  judgeId?: number | null;
  position: number | null;
  accepted: boolean | null;
  grade?: string | null;
  titles?: string[];
  nomBis?: boolean;
  judge?: { id?: number; name?: string | null } | null;
}

type EvalRound = 'nomination' | 'ring1' | 'ring2';

function judgeDisplayName(ev: Evaluation): string {
  const n = ev.judge?.name?.trim();
  if (n && n.length > 0) return n;
  if (ev.judgeId != null && Number.isFinite(ev.judgeId)) {
    return `Sudca #${ev.judgeId}`;
  }
  return 'Rozhodca';
}

function evaluationsForCatRound(
  evals: Evaluation[],
  catId: number,
  round: EvalRound,
): Evaluation[] {
  return evals
    .filter((e) => e.catId === catId && e.round === round)
    .slice()
    .sort((a, b) => {
      const c = judgeDisplayName(a).localeCompare(judgeDisplayName(b), 'sk', {
        sensitivity: 'base',
      });
      if (c !== 0) return c;
      return a.id - b.id;
    });
}

function displayCatCompetitionClass(c: ApiCat): string {
  const klass = typeof c.class === 'string' ? c.class.trim() : '';
  if (klass.length > 0) return klass;
  return '—';
}

function displayCatGroup(c: ApiCat): string {
  const fromArr = c.groups;
  if (Array.isArray(fromArr)) {
    const parts = fromArr.map((x) => String(x).trim()).filter((x) => x.length > 0);
    if (parts.length > 0) return parts.join(', ');
  }
  const g = typeof c.group === 'string' ? c.group.trim() : '';
  return g.length > 0 ? g : '—';
}

const route = useRoute();
const authStore = useAuthStore();
const $q = useQuasar();
const competitionId = computed(() => route.params.competitionId as string);
const competitionNumericId = computed(() => {
  const n = Number(competitionId.value);
  return Number.isFinite(n) && n >= 1 ? n : null;
});

useCompetitionRealtime({
  competitionId: competitionNumericId,
  onInvalidate: () => void loadData({ silent: true }),
});

const myCats = ref<Cat[]>([]);
const exhibitorName = ref('');
const loading = ref(false);
const pushPermission = ref<NotificationPermission>('default');
const pushEnabled = ref(false);
const pushBusy = ref(false);

const showPushBanner = computed(() => !pushEnabled.value && pushPermission.value !== 'denied');

const completedCount = computed(() => myCats.value.filter((c) => c.status === 'Completed').length);

function mapStatus(apiStatus: string): Cat['status'] {
  switch (apiStatus) {
    case 'called':
      return 'Called';
    case 'judging':
      return 'Being Judged';
    case 'completed':
      return 'Completed';
    default:
      return 'Waiting';
  }
}

function mapSex(sex: string): string {
  if (sex === 'M') return 'Male';
  if (sex === 'SF' || sex === 'F') return 'Female';
  return sex;
}

function getMessage(status: Cat['status']): string {
  switch (status) {
    case 'Called':
      return 'Your cat has been called! Please prepare.';
    case 'Being Judged':
      return 'Currently being judged';
    case 'Waiting':
      return 'Waiting for evaluation';
    default:
      return '';
  }
}

const loadData = async (opts: { silent?: boolean } = {}) => {
  if (!competitionId.value || !authStore.user) return;
  const silent = opts.silent === true;
  if (!silent) loading.value = true;
  try {
    const [compRes, exhibitorsRes, catsRes, evalsRes, ordersRes] = await Promise.all([
      api.get<{ currentRound: string | null }>(`/competitions/${competitionId.value}`),
      api.get<Exhibitor[]>(`/competitions/${competitionId.value}/exhibitors`),
      api.get<ApiCat[]>(`/competitions/${competitionId.value}/cats`),
      api.get<Evaluation[]>(`/competitions/${competitionId.value}/evaluations`),
      api
        .get<unknown[]>(`/competitions/${competitionId.value}/judging-orders`)
        .catch(() => ({ data: [] as unknown[] })),
    ]);
    const competitionRound = compRes.data?.currentRound ?? null;
    const exhibitors = exhibitorsRes.data ?? [];
    const myExhibitors = exhibitors.filter((e) => e.userId === authStore.user?.id);
    const exhibitorIds = new Set(myExhibitors.map((e) => e.id));
    exhibitorName.value = myExhibitors[0]?.name ?? authStore.user?.fullName ?? '';

    const judgingOrders = (ordersRes.data ?? []).map(normalizeJudgingOrderRow);
    const apiCats = (catsRes.data ?? []).filter((c) => c.exhibitorId && exhibitorIds.has(c.exhibitorId));
    const evals: Evaluation[] = evalsRes.data ?? [];

    myCats.value = apiCats.map((c) => {
      const badgePhase = badgePhaseFromCompRound(competitionRound);
      const phaseCalls = {
        nomination: exhibitorAggregatePhase(c.id, c.status, judgingOrders, 'nomination'),
        ring1: exhibitorAggregatePhase(c.id, c.status, judgingOrders, 'ring1'),
        ring2: exhibitorAggregatePhase(c.id, c.status, judgingOrders, 'ring2'),
      };
      const merged = phaseCalls[badgePhase];
      const status = mapStatus(merged);
      const locs = buildLocationsForCat(c.id, judgingOrders, competitionRound);
      const nominationRows: NominationExhibitorRow[] = evaluationsForCatRound(
        evals,
        c.id,
        'nomination',
      ).map((e) => ({
        judgeName: judgeDisplayName(e),
        grade: e.grade ?? null,
        titles: Array.isArray(e.titles) ? [...e.titles] : [],
        nomBis: !!e.nomBis,
      }));
      const ring1Rows: Ring1ExhibitorRow[] = evaluationsForCatRound(
        evals,
        c.id,
        'ring1',
      ).map((e) => ({
        judgeName: judgeDisplayName(e),
        accepted: e.accepted ?? null,
      }));
      const ring2Rows: Ring2ExhibitorRow[] = evaluationsForCatRound(
        evals,
        c.id,
        'ring2',
      ).map((e) => ({
        judgeName: judgeDisplayName(e),
        position: e.position ?? null,
      }));
      const cat: Cat = {
        id: String(c.id),
        name: c.name,
        breed: c.breed,
        competitionClass: displayCatCompetitionClass(c),
        gender: mapSex(c.sex),
        age: c.age,
        registration: c.registrationNumber,
        status,
        message: getMessage(status),
        nominationRows,
        ring1Rows,
        ring2Rows,
        phaseCalls,
      };
      const wcfSkupina = displayCatGroup(c);
      if (wcfSkupina !== '—') {
        cat.breedGroup = wcfSkupina;
      }
      if (locs != null && locs.length > 0) {
        cat.locations = locs;
      }
      return cat;
    });
  } catch (err) {
    console.error('Failed to load overview:', err);
  } finally {
    if (!silent) loading.value = false;
  }
};

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

async function syncPushState() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  pushPermission.value = Notification.permission;
  if (pushPermission.value === 'denied') {
    pushEnabled.value = false;
    return;
  }

  const registration = await navigator.serviceWorker.register('/push-sw.js');
  const existing = await registration.pushManager.getSubscription();
  if (!existing) {
    pushEnabled.value = false;
    return;
  }

  try {
    await api.post('/notifications/push/subscriptions', {
      subscription: existing.toJSON(),
    });
    pushEnabled.value = true;
  } catch {
    pushEnabled.value = false;
  }
}

async function enablePushNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    $q.notify({ type: 'warning', message: 'Váš prehliadač nepodporuje push notifikácie.', position: 'top' });
    return;
  }

  pushBusy.value = true;
  try {
    const permission = await Notification.requestPermission();
    pushPermission.value = permission;
    if (permission !== 'granted') {
      pushEnabled.value = false;
      $q.notify({ type: 'warning', message: 'Notifikácie neboli povolené.', position: 'top' });
      return;
    }

    const { data } = await api.get<{ enabled: boolean; publicKey: string }>(
      '/notifications/push/public-key',
    );
    if (!data.enabled || !data.publicKey) {
      $q.notify({ type: 'warning', message: 'Push notifikácie nie sú na serveri nakonfigurované.', position: 'top' });
      pushEnabled.value = false;
      return;
    }

    const registration = await navigator.serviceWorker.register('/push-sw.js');
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(data.publicKey),
      }));

    await api.post('/notifications/push/subscriptions', {
      subscription: subscription.toJSON(),
    });

    pushEnabled.value = true;
    $q.notify({ type: 'positive', message: 'Notifikácie sú zapnuté.', position: 'top' });
  } catch (err) {
    console.error('Failed to enable push notifications:', err);
    pushEnabled.value = false;
    $q.notify({ type: 'negative', message: 'Nepodarilo sa zapnúť notifikácie.', position: 'top' });
  } finally {
    pushBusy.value = false;
  }
}

onMounted(() => {
  void loadData();
  void syncPushState();
});

function getStatusColor(status: string): string {
  switch (status) {
    case 'Called':
      return 'blue';
    case 'Being Judged':
      return 'orange';
    case 'Waiting':
      return 'grey-7';
    case 'Completed':
      return 'green';
    default:
      return 'grey';
  }
}

function getCardBorderClass(status: string): string {
  switch (status) {
    case 'Called':
      return 'card-called';
    case 'Being Judged':
      return 'card-judging';
    case 'Completed':
      return 'card-completed';
    case 'Waiting':
      return 'card-waiting';
    default:
      return '';
  }
}

function getLocationStatusClass(callStatus: Location['callStatus']): string {
  return callStatus === 'judging' ? 'location-status-judging' : 'location-status-called';
}

function getMessageClass(status: string): string {
  switch (status) {
    case 'Called':
      return 'message-called';
    case 'Being Judged':
      return 'message-judging';
    case 'Waiting':
      return 'message-waiting';
    default:
      return '';
  }
}

function getMessageIcon(status: string): string {
  switch (status) {
    case 'Called':
      return 'emoji_events';
    case 'Being Judged':
      return 'trending_up';
    case 'Waiting':
      return 'schedule';
    default:
      return 'info';
  }
}
</script>

<style scoped>
.page-wrapper {
  max-width: 900px;
  margin: 0 auto;
  background: transparent;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 500;
}

.page-subtitle {
  font-size: 1rem;
  color: #6b7280;
}

.round-badge {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 1rem;
}

.summary-card {
  min-height: 100px;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.summary-number {
  font-size: 2.5rem;
  font-weight: 400;
  margin-top: 0.5rem;
}

.cat-card {
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  background: #fff !important;
}

.full-height {
  height: 100%;
}

.card-called {
  border: 1px solid #2B7FFF !important;
  background: #EFF6FF !important;
}

.card-judging {
  border: 1px solid #F0B100 !important;
  background: #FEFCE8 !important;
}

.card-completed {
  border: 1px solid #00C950 !important;
  background: #fff !important;
}

.card-waiting {
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  background: #fff !important;
}

.cat-name {
  font-size: 1.125rem;
  font-weight: 500;
}

.cat-breed {
  font-size: 0.875rem;
  color: #6b7280;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 0.25rem;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.detail-row-extra {
  margin-top: 0.125rem;
}

.detail-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
}

.detail-badge {
  width: fit-content;
  font-size: 0.75rem;
}

.alert-banner {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  color: #92400e;
  font-size: 0.875rem;
}

.locations {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.location-card {
  border-radius: 0.5rem;
  padding: 0.75rem;
  border: 1px solid;
}

.location-status-called {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.location-status-called .location-type {
  color: #1e40af;
}

.location-status-called .location-time {
  color: #1d4ed8;
}

.location-status-judging {
  border-color: #f59e0b;
  background-color: #fffbeb;
}

.location-status-judging .location-type {
  color: #b45309;
}

.location-status-judging .location-time {
  color: #92400e;
}

.location-type {
  font-size: 0.75rem;
  font-weight: 600;
}

.location-table {
  font-size: 0.875rem;
}

.location-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.message-banner {
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.message-called {
  background-color: #dbeafe;
  color: #1e40af;
}

.message-judging {
  background-color: #fef3c7;
  color: #92400e;
}

.message-waiting {
  background-color: #f3f4f6;
  color: #4b5563;
}

.results-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.exhibitor-eval-block {
  padding-left: 0.5rem;
  border-left: 2px solid #e5e7eb;
}

.result-position {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.result-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.result-advanced {
  background-color: #00C950;
  color: white;
}

.result-not-advanced {
  background-color: #F0B100;
  color: white;
}
</style>
