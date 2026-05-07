<template>
  <q-page class="nomination-page">
    <div class="page-container">
      <!-- Main Card -->
      <q-card class="main-card">
        <q-card-section>
          <!-- Header -->
          <div class="header-section">
            <div class="row items-center justify-center q-gutter-sm">
              <img src="../assets/Icon.svg" alt="Crown" class="header-icon" />
              <div class="page-title">Nomination - Evaluation</div>
            </div>
            <div class="badges-row">
              <q-badge outline color="grey-7" text-color="grey-7" class="status-badge">
                Rated: {{ ratedCount }}/{{ totalCats }}
              </q-badge>
              <q-badge
                v-if="nominatedCatId"
                color="amber"
                text-color="dark"
                class="status-badge nombis-badge"
              >
                <img src="../assets/Icon.svg" alt="Crown" class="badge-icon" />
                NomBIS
              </q-badge>
            </div>
          </div>

          <q-btn-toggle
            v-if="
              !loading &&
              nominationPhaseActive &&
              currentJudgeId &&
              judgeProtocolGroupTabs.length > 1 &&
              judgingOrders.length > 0
            "
            v-model="selectedNomProtocolGroup"
            :options="nomProtocolGroupToggleOptions"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="grey-4"
            text-color="grey-9"
            class="full-width q-mb-md protocol-group-toggle"
          />

          <div
            v-if="
              !loading &&
              nominationPhaseActive &&
              currentJudgeId &&
              judgeSelfSteward &&
              !judgeSubmissionLocked &&
              cats.length > 0
            "
            class="row justify-end q-mb-md"
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

          <q-banner
            v-if="!loading && competitionStatus === 'scheduled'"
            rounded
            class="bg-light-blue-2 text-dark q-mb-md"
          >
            Súťaž ešte nezačala. Hodnotenie sa otvorí po spustení nominácie.
          </q-banner>

          <q-banner
            v-if="!loading && competitionStatus === 'paused' && competitionRound === null"
            rounded
            class="bg-amber-2 text-dark q-mb-md"
          >
            Všetci rozhodcovia potvrdili nomináciu. Súťaž čaká na spustenie Ring 1.
          </q-banner>

          <q-banner
            v-if="
              !loading &&
              !nominationPhaseActive &&
              !(competitionStatus === 'paused' && competitionRound === null) &&
              competitionStatus !== 'scheduled'
            "
            rounded
            class="bg-orange-2 text-dark q-mb-md"
          >
            Aktuálne kolo nie je nominácia. Mačky na hodnotenie sa zobrazia po jej spustení.
          </q-banner>

          <q-banner
            v-if="!loading && nominationPhaseActive && !currentJudgeId"
            rounded
            class="bg-red-2 text-dark q-mb-md"
          >
            Nemáte priradený záznam rozhodcu v tejto súťaži. Kontaktujte administrátora.
          </q-banner>

          <q-banner
            v-if="!loading && nominationPhaseActive && currentJudgeId && cats.length === 0"
            rounded
            class="bg-blue-2 text-dark q-mb-md"
          >
            Pre vás nie sú priradené žiadne mačky na posudzovanie. Ak v tomto kole neposudzujete, môžete nomináciu
            rovno potvrdiť. Inak kontaktujte administrátora.
          </q-banner>

          <div
            v-if="!loading && nominationPhaseActive && currentJudgeId && !judgeSubmissionLocked && cats.length === 0"
            class="row justify-center q-mb-md"
          >
            <q-btn unelevated color="green" class="confirm-btn" @click="confirmNomBIS">
              <img src="../assets/Icon.svg" alt="Crown" class="btn-icon btn-icon-white" />
              Potvrdiť nomináciu
            </q-btn>
          </div>

          <q-banner
            v-if="!loading && nominationPhaseActive && currentJudgeId && judgeSubmissionLocked"
            rounded
            class="bg-green-2 text-dark q-mb-md"
          >
            Vaše odovzdanie bolo zaznamenané. Hodnotenie je zamknuté. Pokračovať môžete až po odomknutí administrátorom.
          </q-banner>

          <!-- Cat Cards Grid -->
          <div v-if="loading" class="text-center q-pa-lg">
            <q-spinner-dots color="primary" size="40px" />
          </div>
          <div v-else-if="nominationPhaseActive && currentJudgeId && !judgeSubmissionLocked" class="cats-grid">
            <q-banner
              v-if="catsForGrid.length === 0 && cats.length > 0"
              rounded
              dense
              class="bg-blue-1 text-dark full-width q-mb-md"
            >
              V tejto skupine nie sú žiadne mačky. Prepnite skupinu vyššie.
            </q-banner>
            <div
              v-for="cat in catsForGrid"
              :key="cat.id"
              class="cat-card"
              :class="[
                getCardClass(cat),
                { 'cat-card--self-steward': judgeSelfSteward && !judgeSubmissionLocked },
              ]"
              @click="openJudgingModal(cat)"
            >
              <img
                v-if="nominatedCatId === cat.id"
                src="../assets/Icon.svg"
                alt="Crown"
                class="crown-icon"
              />
              <div class="cat-number">{{ cat.registrationNumber }}</div>
              <div v-if="cat.grade" class="badges-container">
                <q-badge
                  :color="getGradeBadgeColor(cat.grade)"
                  text-color="white"
                  class="grade-badge"
                >
                  {{ cat.grade }}
                </q-badge>
              </div>
              <div v-if="cat.titles.length > 0" class="titles-container">
                <q-badge
                  v-for="title in cat.titles"
                  :key="title"
                  outline
                  color="grey-8"
                  text-color="grey-8"
                  class="title-badge"
                >
                  {{ title }}
                </q-badge>
              </div>
              <div
                v-if="judgeSelfSteward && !judgeSubmissionLocked"
                class="nomination-self-steward-slot"
              >
                <JudgeSelfStewardStatusChip :status="cat.status" @cycle="cycleCatCallStatus(cat)" />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Bottom Bar for NomBIS -->
    <div v-if="nominatedCatId && nominationPhaseActive && currentJudgeId && !judgeSubmissionLocked" class="bottom-bar">
      <div class="bottom-bar-content">
        <div class="nombis-info">
          <img src="../assets/Icon.svg" alt="Crown" class="bottom-icon" />
          <div class="nombis-text">
            <div class="nombis-label">NomBIS:</div>
            <div class="nombis-cat">{{ nominatedCatName }} ({{ nominatedCatRegistration }})</div>
          </div>
        </div>
        <div class="bottom-bar-actions">
          <q-btn outline color="amber-8" class="change-btn" @click="openNomBISModal">
            <img src="../assets/Icon.svg" alt="Crown" class="btn-icon" />
            Change
          </q-btn>
          <q-btn unelevated color="green" class="confirm-btn" @click="confirmNomBIS">
            <img src="../assets/Icon.svg" alt="Crown" class="btn-icon btn-icon-white" />
            Confirm
          </q-btn>
        </div>
      </div>
    </div>

    <!-- Judging Modal -->
    <q-dialog v-model="showModal">
      <q-card class="judging-modal">
        <q-card-section class="modal-header">
          <div class="modal-title">Hodnotenie mačky {{ selectedCat?.registrationNumber }}</div>
          <q-btn flat round icon="close" size="sm" @click="closeModal" />
        </q-card-section>

        <q-card-section class="modal-content">
          <!-- Cat Info -->
          <div class="cat-info-section">
            <div class="info-label">Name</div>
            <div class="info-value">{{ selectedCat?.name }}</div>
            <div class="info-label">Code</div>
            <div class="info-value">{{ selectedCat?.code }}</div>
            <div class="info-label">Sex</div>
            <div class="info-value">{{ selectedCat?.sex }}</div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Grade Selection -->
          <div class="selection-section">
            <div class="section-title">Grade</div>
            <div class="grade-buttons">
              <q-btn
                v-for="grade in grades"
                :key="grade"
                :outline="selectedGrade !== grade"
                :unelevated="selectedGrade === grade"
                :color="selectedGrade === grade ? 'dark' : 'grey-7'"
                :label="grade"
                class="grade-btn"
                @click="toggleNominationGrade(grade)"
              />
            </div>
          </div>

          <!-- Title Selection -->
          <div class="selection-section">
            <div class="section-title">Titul (optional)</div>
            <div v-if="availableTitlesForSelectedCat.length > 0" class="title-buttons">
              <q-btn
                v-for="title in availableTitlesForSelectedCat"
                :key="title"
                :outline="!selectedTitles.includes(title)"
                :unelevated="selectedTitles.includes(title)"
                :color="selectedTitles.includes(title) ? 'dark' : 'grey-7'"
                class="title-btn"
                @click="toggleTitle(title)"
              >
                <q-icon name="star_outline" size="16px" class="q-mr-xs" />
                {{ title }}
              </q-btn>
            </div>
            <div v-else class="text-grey-6 text-body2">Pre túto mačku nie je dostupný žiadny titul.</div>
          </div>

          <!-- NomBIS Selection -->
          <div v-if="selectedGradeAllowsNomBis" class="selection-section">
            <div class="section-title">NomBIS (optional)</div>
            <q-btn
              :outline="!isNominatedForBIS"
              :unelevated="isNominatedForBIS"
              :color="isNominatedForBIS ? 'dark' : 'grey-7'"
              class="nombis-btn full-width"
              @click="toggleNomBIS"
            >
              <img src="../assets/Icon.svg" alt="Crown" class="btn-icon-small" />
              Nominate for BIS
            </q-btn>
          </div>
        </q-card-section>

        <q-card-section class="modal-actions">
          <q-btn outline color="grey-7" label="Cancel" class="action-btn" @click="closeModal" />
          <q-btn unelevated color="green" label="Save" class="action-btn" @click="saveJudging" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- NomBIS Selection Modal -->
    <q-dialog v-model="showNomBISModal">
      <q-card class="nombis-modal">
        <q-card-section class="modal-header">
          <div class="row items-center q-gutter-sm">
            <img src="../assets/Icon.svg" alt="Crown" class="modal-header-icon" />
            <div class="modal-title">Nominate for NomBIS</div>
          </div>
          <q-btn flat round icon="close" size="sm" @click="closeNomBISModal" />
        </q-card-section>

        <q-card-section>
          <div class="nombis-subtitle">Nominate best cat for BIS round</div>

          <div class="eligible-cats-list">
            <div
              v-for="cat in eligibleCats"
              :key="cat.id"
              class="eligible-cat-card"
              :class="{ selected: tempSelectedNomBIS === cat.id }"
              @click="tempSelectedNomBIS = cat.id"
            >
              <div class="eligible-cat-header">
                <div class="eligible-cat-badges">
                  <q-badge color="dark" text-color="white" class="id-badge">
                    {{ cat.registrationNumber }}
                  </q-badge>
                  <q-badge
                    :color="getGradeBadgeColor(cat.grade)"
                    text-color="white"
                    class="grade-badge-small"
                  >
                    {{ cat.grade }}
                  </q-badge>
                </div>
                <q-badge
                  v-if="tempSelectedNomBIS === cat.id"
                  color="green"
                  text-color="white"
                  class="selected-badge"
                >
                  Selected
                </q-badge>
              </div>
              <div class="eligible-cat-info">
                <div class="eligible-cat-name">
                  <img
                    v-if="nominatedCatId === cat.id"
                    src="../assets/Icon.svg"
                    alt="Crown"
                    class="cat-crown-icon"
                  />
                  {{ cat.name }}
                </div>
                <div class="eligible-cat-breed">{{ cat.code }}</div>
              </div>
              <div v-if="cat.titles.length > 0" class="eligible-cat-titles">
                <q-badge
                  v-for="title in cat.titles"
                  :key="title"
                  color="dark"
                  text-color="white"
                  class="title-badge-small"
                >
                  {{ title }}
                </q-badge>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="modal-actions">
          <q-btn
            outline
            color="grey-7"
            label="Cancel"
            class="action-btn"
            @click="closeNomBISModal"
          />
          <q-btn
            unelevated
            color="green"
            label="Confirm"
            class="action-btn"
            @click="confirmNomBISSelection"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';
import { useCompetitionRealtime } from 'src/composables/useCompetitionRealtime';
import { useCompetitionStore } from 'src/stores/competition';
import { useWcfTaxonomyStore } from 'src/stores/wcf_taxonomy';
import { quasarColorBySortOrder } from 'src/utils/taxonomy_colors';
import { resolveActingJudgeId } from 'src/utils/acting_judge';
import JudgeSelfStewardStatusChip from 'src/components/JudgeSelfStewardStatusChip.vue';
import {
  advanceSelfStewardCallNext,
  catsInStewardCallOrder,
  type CatCallStatus,
  judgingOrderRowForJudgeCat,
  nextCatCallStatus,
  parseCatCallStatus,
  parseJudgingOrderApiRowStrict,
  protocolGroupTabsForJudge,
  setOrderProtocolLocal,
} from 'src/utils/cat_steward_cycle';

interface ApiCat {
  id: number;
  registrationNumber: string;
  name: string;
  breed: string;
  group: string;
  groups?: string[];
  class?: string | null;
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
  code: string;
  sex: string;
  groups: string[];
  catClass: string | null;
  grade: string | null;
  titles: string[];
  status: CatCallStatus;
}

interface Evaluation {
  id: number;
  catId: number;
  judgeId: number | null;
  round: string;
  grade: string | null;
  titles: string[];
  nomBis: boolean;
}

interface Judge {
  id: number;
  name: string;
  userId: number | null;
  stewardUserId?: number | null;
  nominationConfirmed?: boolean;
}

interface JudgingOrderRow {
  id: number;
  judgeId: number;
  catId: number;
  orderPosition: number;
  tableNumber: number;
  protocolGroup: string | null;
  protocolCallStatus: CatCallStatus;
  ring1ProtocolCallStatus: CatCallStatus;
  ring2ProtocolCallStatus: CatCallStatus;
}

function toJudgingOrderRow(raw: unknown): JudgingOrderRow {
  const o = parseJudgingOrderApiRowStrict(raw as Record<string, unknown>);
  const pg = o.protocolGroup;
  return {
    id: o.id,
    judgeId: o.judgeId,
    catId: o.catId,
    orderPosition: o.orderPosition,
    tableNumber: o.tableNumber,
    protocolGroup:
      typeof pg === 'string' && pg.trim().length > 0 ? pg.trim() : null,
    protocolCallStatus: o.protocolCallStatus ?? 'waiting',
    ring1ProtocolCallStatus: o.ring1ProtocolCallStatus ?? 'waiting',
    ring2ProtocolCallStatus: o.ring2ProtocolCallStatus ?? 'waiting',
  };
}

const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const compStore = useCompetitionStore();
const taxStore = useWcfTaxonomyStore();
const competitionId = computed(() => route.params.competitionId as string);

const competitionNumericId = computed(() => {
  const n = Number(competitionId.value);
  return Number.isFinite(n) && n >= 1 ? n : null;
});

useCompetitionRealtime({
  competitionId: competitionNumericId,
  onInvalidate: () => void loadData({ silent: true }),
});

const showModal = ref(false);
const showNomBISModal = ref(false);
const selectedCat = ref<Cat | null>(null);
const selectedGrade = ref<string | null>(null);
const selectedTitles = ref<string[]>([]);
const nominatedCatId = ref<string | null>(null);
const tempSelectedNomBIS = ref<string | null>(null);
const loading = ref(false);
const evaluationMap = ref<Map<number, Evaluation>>(new Map());
const currentJudgeId = ref<number | null>(null);
const judges = ref<Judge[]>([]);
const judgeSubmissionLocked = ref(false);

/** Grade kódy pre súťaž (z WCF taxonómie). Defaultne EX1/EX2/EX3/VG. */
const grades = computed(() => {
  const codes = taxStore.gradeCodes;
  if (codes.length > 0) return codes;
  return ['EX1', 'EX2', 'EX3', 'VG'];
});

/** Kódy titulov dostupných pre vybranú mačku. */
const availableTitlesForSelectedCat = computed(() => {
  if (!selectedCat.value) return [];
  const filtered = taxStore.titlesForCat({
    catClass: selectedCat.value.catClass,
  });
  return filtered.map((t) => t.code);
});

/** Pre filtrovanie zobrazených titulov na karte mačky – iba tie, ktoré sú v aktuálnej taxonómii alebo zhodné so skupinou. */
const taxonomyTitleCodes = computed(() => new Set(taxStore.titles.map((t) => t.code)));

/** Zachová tituly z taxonómie; ak taxonómia chýba, fallback na skupiny mačky. */
function filterStoredTitles(stored: string[], groups: string[]): string[] {
  const groupSet = new Set(groups);
  if (taxonomyTitleCodes.value.size === 0) {
    return stored.filter((t) => groupSet.has(t));
  }
  return stored.filter((t) => taxonomyTitleCodes.value.has(t) || groupSet.has(t));
}

const cats = ref<Cat[]>([]);
const judgingOrders = ref<JudgingOrderRow[]>([]);
const selectedNomProtocolGroup = ref('');
const callNextBusy = ref(false);
const competitionRound = ref<string | null>(null);
const competitionStatus = ref<string>('active');

const nominationPhaseActive = computed(() => competitionRound.value === 'nomination');

/** Rozhodca bez priradeného stevarda si môže sám posúvať stav vyvolávania. */
const judgeSelfSteward = computed(() => {
  const jid = currentJudgeId.value;
  if (jid == null) return false;
  const j = judges.value.find((x) => x.id === jid);
  return j != null && j.stewardUserId == null;
});

const judgeProtocolGroupTabs = computed(() =>
  protocolGroupTabsForJudge(judgingOrders.value, currentJudgeId.value),
);

const nomProtocolGroupToggleOptions = computed(() =>
  judgeProtocolGroupTabs.value.map((o) => ({ label: o.label, value: o.key })),
);

watch(
  [currentJudgeId, judgeProtocolGroupTabs],
  () => {
    const opts = judgeProtocolGroupTabs.value;
    if (opts.length === 0) {
      selectedNomProtocolGroup.value = '';
      return;
    }
    if (!opts.some((o) => o.key === selectedNomProtocolGroup.value)) {
      selectedNomProtocolGroup.value = opts[0]!.key;
    }
  },
  { immediate: true },
);

/** Rovnaké poradie ako `nominationQueueCats` u stevarda v nominácii (pre aktívnu skupinu). */
const catsCallQueue = computed(() => {
  const tabs = judgeProtocolGroupTabs.value;
  const filter =
    judgingOrders.value.length > 0 && tabs.length > 1 ? selectedNomProtocolGroup.value : null;
  return catsInStewardCallOrder(cats.value, judgingOrders.value, currentJudgeId.value, filter);
});

const catsForGrid = computed(() =>
  judgingOrders.value.length === 0 ? cats.value : catsCallQueue.value,
);

const totalCats = computed(() => catsForGrid.value.length);
const ratedCount = computed(() => catsForGrid.value.filter((c) => c.grade !== null).length);

const nominatedCatName = computed(() => {
  const cat = cats.value.find((c) => c.id === nominatedCatId.value);
  return cat?.name || '';
});

const nominatedCatRegistration = computed(() => {
  const cat = cats.value.find((c) => c.id === nominatedCatId.value);
  return cat?.registrationNumber ?? '';
});

/** Mačky dostupné pre ručný NomBIS výber. WCF vhodnosť riešime iba varovaním. */
const eligibleCats = computed(() => {
  return cats.value.filter((c) => c.grade != null);
});

/** Či je vybraný grade vhodný pre NomBIS (zobrazenie tlačidla NomBIS v modáli). */
const selectedGradeAllowsNomBis = computed(() => {
  return catGradeAllowsNomBis(selectedGrade.value);
});

function catGradeAllowsNomBis(grade: string | null): boolean {
  if (!grade) return false;
  const nomCodes = taxStore.nomBisGradeCodes;
  if (nomCodes.length === 0) return grade === 'EX1';
  return nomCodes.includes(grade);
}

const isNominatedForBIS = computed(() => {
  return selectedCat.value?.id === nominatedCatId.value;
});

const getCardClass = (cat: Cat): string => {
  if (!cat.grade) return 'card-unrated';
  if (cat.grade === 'EX1') return 'card-ex1';
  if (cat.grade === 'EX2') return 'card-ex2';
  if (cat.grade === 'EX3') return 'card-ex3';
  if (cat.grade === 'VG') return 'card-vg';
  return 'card-unrated';
};

const getGradeBadgeColor = (grade: string | null): string => {
  if (!grade) return 'grey';
  const tax = taxStore.grades.find((g) => g.code === grade);
  if (tax) return quasarColorBySortOrder(tax.sortOrder);
  if (grade === 'EX1') return 'orange';
  if (grade === 'EX2') return 'orange';
  if (grade === 'EX3') return 'blue';
  if (grade === 'VG') return 'grey-7';
  return 'grey';
};

const loadData = async (opts: { silent?: boolean } = {}) => {
  if (!competitionId.value) return;
  const silent = opts.silent === true;
  if (!silent) loading.value = true;
  try {
    const cidNum = Number(competitionId.value);
    if (Number.isFinite(cidNum)) {
      // WCF taxonómia: load v pozadí (cache, nepriechodzí pri každom refreshe)
      void taxStore.loadAll(cidNum);
    }
    const { data: comp } = await api.get<{
      currentRound: string | null;
      status: string;
    }>(`/competitions/${competitionId.value}`);
    competitionRound.value = comp.currentRound ?? null;
    competitionStatus.value = comp.status ?? 'active';

    if (competitionRound.value !== 'nomination') {
      cats.value = [];
      evaluationMap.value = new Map();
      nominatedCatId.value = null;
      judges.value = [];
      judgingOrders.value = [];
      currentJudgeId.value = null;
      judgeSubmissionLocked.value = false;
      return;
    }

    const [catsRes, evalsRes, judgesRes, ordersRes] = await Promise.all([
      api.get<ApiCat[]>(`/competitions/${competitionId.value}/cats`, {
        params: { nominationForMe: true },
      }),
      api.get<Evaluation[]>(`/competitions/${competitionId.value}/evaluations`, { params: { round: 'nomination' } }),
      api.get<Judge[]>(`/competitions/${competitionId.value}/judges`),
      api.get<unknown[]>(`/competitions/${competitionId.value}/judging-orders`),
    ]);
    judgingOrders.value = (ordersRes.data ?? []).map(toJudgingOrderRow).filter((o) => o.id >= 1);
    judges.value = judgesRes.data ?? [];
    const actingAuth = {
      isAdmin: authStore.isAdmin,
      userId: authStore.user?.id,
      hasCompetitionRole: authStore.hasCompetitionRole.bind(authStore),
    };
    currentJudgeId.value =
      Number.isFinite(cidNum) && cidNum >= 1
        ? resolveActingJudgeId(route, judges.value, actingAuth, cidNum)
        : null;
    const activeJudge = judges.value.find((j) => j.id === currentJudgeId.value);
    judgeSubmissionLocked.value = !!activeJudge?.nominationConfirmed;
    const jidForStatus = currentJudgeId.value;

    const evals = evalsRes.data ?? [];
    const map = new Map<number, Evaluation>();
    const jid = jidForStatus;
    evals.forEach((e) => {
      if (jid != null && e.judgeId != null && Number(e.judgeId) === Number(jid)) {
        map.set(Number(e.catId), e);
      }
    });
    evaluationMap.value = map;

    const apiCats = catsRes.data ?? [];
    cats.value = apiCats.map((c) => {
      const eval_ = map.get(Number(c.id));
      const groups =
        Array.isArray(c.groups) && c.groups.length > 0
          ? c.groups
          : c.group && c.group.length > 0
            ? [c.group]
            : [];
      const catClass = typeof c.class === 'string' && c.class.trim().length > 0 ? c.class : null;
      return {
        id: String(c.id),
        registrationNumber: c.registrationNumber,
        name: c.name,
        code: c.breed,
        sex: c.sex,
        groups,
        catClass,
        grade: eval_?.grade ?? null,
        // Zachovaj uložené tituly len ak sú v aktuálnej taxonómii alebo medzi skupinami mačky
        titles: filterStoredTitles(eval_?.titles ?? [], groups),
        status:
          jidForStatus != null
            ? parseCatCallStatus(
                judgingOrderRowForJudgeCat(judgingOrders.value, jidForStatus, Number(c.id))
                  ?.protocolCallStatus ?? c.status,
              )
            : parseCatCallStatus(c.status),
      };
    });
    const nomEval = [...map.values()].find((e) => Boolean(e.nomBis));
    nominatedCatId.value = nomEval ? String(nomEval.catId) : null;
  } catch (err) {
    console.error('Failed to load nomination data:', err);
  } finally {
    if (!silent) loading.value = false;
  }
};

onMounted(() => {
  void loadData();
});

// Keď sa zmení súťaž v URL, premaž taxonómiu aby sa nepoužila stará.
watch(competitionId, (id) => {
  const n = Number(id);
  if (Number.isFinite(n)) {
    taxStore.setActiveCompetition(n);
  }
});

watch(
  () => route.query.asJudgeId,
  () => {
    void loadData({ silent: true });
  },
);

async function cycleCatCallStatus(cat: Cat) {
  if (!competitionId.value || judgeSubmissionLocked.value) return;
  const next = nextCatCallStatus(cat.status);
  try {
    const ord = judgingOrderRowForJudgeCat(judgingOrders.value, currentJudgeId.value, Number(cat.id));
    if (ord?.id != null && judgingOrders.value.length > 0) {
      await api.put(
        `/competitions/${competitionId.value}/judging-orders/${ord.id}/call-status`,
        { protocolCallStatus: next },
      );
      setOrderProtocolLocal(ord, 'nomination', next);
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
  if (!competitionId.value || !judgeSelfSteward.value || judgeSubmissionLocked.value) return;
  callNextBusy.value = true;
  try {
    const steps = await advanceSelfStewardCallNext(catsCallQueue.value, async (cat, s) => {
      const ord = judgingOrderRowForJudgeCat(judgingOrders.value, currentJudgeId.value, Number(cat.id));
      if (ord?.id != null && judgingOrders.value.length > 0) {
        await api.put(
          `/competitions/${competitionId.value}/judging-orders/${ord.id}/call-status`,
          { protocolCallStatus: s },
        );
        setOrderProtocolLocal(ord, 'nomination', s);
      } else {
        await api.put(`/competitions/${competitionId.value}/cats/${cat.id}`, { status: s });
      }
      cat.status = s;
    });
    if (steps === 0) {
      $q.notify({
        type: 'info',
        message: 'V rade nie je ďalší krok (všetky môžu byť hotové alebo čakajú bez aktívnej volanej / hodnotenia).',
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

const openJudgingModal = (cat: Cat) => {
  if (judgeSubmissionLocked.value) return;
  selectedCat.value = cat;
  selectedGrade.value = cat.grade;
  // Pri otvorení necháme len tie tituly, ktoré sú aktuálne dostupné pre túto mačku
  // (podľa filteru cez triedu / skupiny / taxonómiu).
  const allowed = new Set(availableTitlesForSelectedCat.value);
  selectedTitles.value = [...cat.titles].filter((t) => allowed.has(t));
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedCat.value = null;
  selectedGrade.value = null;
  selectedTitles.value = [];
};

const toggleTitle = (title: string) => {
  if (!availableTitlesForSelectedCat.value.includes(title)) return;
  const index = selectedTitles.value.indexOf(title);
  if (index > -1) {
    selectedTitles.value.splice(index, 1);
  } else {
    selectedTitles.value.push(title);
  }
};

const toggleNomBIS = () => {
  if (selectedCat.value) {
    if (nominatedCatId.value === selectedCat.value.id) {
      nominatedCatId.value = null;
    } else {
      nominatedCatId.value = selectedCat.value.id;
    }
  }
};

function toggleNominationGrade(grade: string) {
  selectedGrade.value = selectedGrade.value === grade ? null : grade;
  if (!selectedGrade.value && selectedCat.value && nominatedCatId.value === selectedCat.value.id) {
    nominatedCatId.value = null;
  }
  if (!selectedGrade.value) {
    selectedTitles.value = [];
  }
}

const saveJudging = async () => {
  if (judgeSubmissionLocked.value) {
    closeModal();
    return;
  }
  if (!selectedCat.value || !competitionId.value || !currentJudgeId.value) {
    closeModal();
    return;
  }
  const catId = Number(selectedCat.value.id);
  const eval_ = evaluationMap.value.get(catId);
  const effectiveGrade =
    selectedGrade.value !== null &&
    typeof selectedGrade.value === 'string' &&
    selectedGrade.value.trim() !== ''
      ? selectedGrade.value.trim()
      : null;

  try {
    const oldNomBisCatId = nominatedCatId.value ? Number(nominatedCatId.value) : null;
    if (oldNomBisCatId && oldNomBisCatId !== catId) {
      const oldEval = evaluationMap.value.get(oldNomBisCatId);
      if (oldEval) {
        await api.put(`/competitions/${competitionId.value}/evaluations/${oldEval.id}`, {
          judgeId: currentJudgeId.value,
          round: 'nomination',
          grade: oldEval.grade,
          titles: oldEval.titles ?? [],
          accepted: null,
          nomBis: false,
          position: null,
        });
      }
    }

    if (effectiveGrade === null) {
      if (!eval_) {
        closeModal();
        return;
      }
      await api.put(`/competitions/${competitionId.value}/evaluations/${eval_.id}`, {
        judgeId: currentJudgeId.value,
        round: 'nomination',
        grade: null,
        titles: [],
        accepted: null,
        nomBis: false,
        position: null,
      });
      const catUn = cats.value.find((c) => c.id === selectedCat.value?.id);
      if (catUn) {
        catUn.grade = null;
        catUn.titles = [];
      }
    } else {
      const isNomBIS = nominatedCatId.value === selectedCat.value.id;
      if (eval_) {
        await api.put(`/competitions/${competitionId.value}/evaluations/${eval_.id}`, {
          judgeId: currentJudgeId.value,
          round: 'nomination',
          grade: effectiveGrade,
          titles: selectedTitles.value,
          accepted: null,
          nomBis: isNomBIS,
          position: null,
        });
      } else {
        const { data } = await api.post(`/competitions/${competitionId.value}/evaluations`, {
          catId,
          judgeId: currentJudgeId.value,
          round: 'nomination',
          grade: effectiveGrade,
          titles: selectedTitles.value,
          accepted: null,
          nomBis: isNomBIS,
          position: null,
        });
        evaluationMap.value.set(catId, data);
      }
      const cat = cats.value.find((c) => c.id === selectedCat.value?.id);
      if (cat) {
        cat.grade = effectiveGrade;
        cat.titles = [...selectedTitles.value];
      }
    }
    await loadData({ silent: true });
  } catch (err) {
    console.error('Failed to save evaluation:', err);
  }
  closeModal();
};

const openNomBISModal = () => {
  if (judgeSubmissionLocked.value) return;
  tempSelectedNomBIS.value = nominatedCatId.value;
  showNomBISModal.value = true;
};

const closeNomBISModal = () => {
  showNomBISModal.value = false;
  tempSelectedNomBIS.value = null;
};

const confirmNomBISSelection = async () => {
  if (!tempSelectedNomBIS.value || !competitionId.value || !currentJudgeId.value) {
    closeNomBISModal();
    return;
  }
  const catId = Number(tempSelectedNomBIS.value);
  const eval_ = evaluationMap.value.get(catId);
  if (!eval_) {
    closeNomBISModal();
    return;
  }
  try {
    await api.put(`/competitions/${competitionId.value}/evaluations/${eval_.id}`, {
      judgeId: currentJudgeId.value,
      round: 'nomination',
      grade: eval_.grade,
      titles: eval_.titles ?? [],
      accepted: null,
      nomBis: true,
      position: null,
    });
    await loadData({ silent: true });
  } catch (err) {
    console.error('Failed to update NomBIS:', err);
    $q.notify({ type: 'negative', message: 'NomBIS sa nepodarilo uložiť.', position: 'top' });
  }
  closeNomBISModal();
};

const confirmNomBIS = async () => {
  if (judgeSubmissionLocked.value) {
    $q.notify({
      type: 'info',
      message: 'Odovzdanie je už potvrdené. Na ďalšie úpravy je potrebné odomknutie administrátorom.',
      position: 'top',
    });
    return;
  }
  showNomBISModal.value = false;
  if (!competitionId.value || !currentJudgeId.value) {
    $q.notify({ type: 'warning', message: 'Nie ste priradený ako rozhodca.' });
    return;
  }
  if (ratedCount.value < totalCats.value) {
    $q.notify({ type: 'warning', message: 'Ohodnoťte všetky mačky pred potvrdením nominácie.' });
    return;
  }
  if (eligibleCats.value.length > 0 && !nominatedCatId.value) {
    $q.notify({
      type: 'info',
      message:
        'WCF odporúča vybrať NomBIS z najlepšie hodnotených mačiek, ale potvrdenie pokračuje bez blokovania.',
      position: 'top',
    });
  }
  try {
    const { data } = await api.post<{
      competition: { currentRound: string | null; status: string };
      allJudgesDone: boolean;
    }>(`/competitions/${competitionId.value}/nomination/complete`);

    if (!data.allJudgesDone) {
      judgeSubmissionLocked.value = true;
      $q.notify({
        type: 'info',
        message: 'Vaša nominácia je potvrdená. Čaká sa, kým potvrdia aj ostatní rozhodcovia.',
        position: 'top',
      });
      await compStore.fetchAll();
      await loadData();
      return;
    }

    competitionRound.value = data.competition.currentRound ?? null;
    competitionStatus.value = data.competition.status;
    const doneMsg =
      data.competition.status === 'paused'
        ? 'Všetci rozhodcovia potvrdili nomináciu. Súťaž je pozastavená do štartu ringu (nastaví administrátor).'
        : 'Všetci rozhodcovia potvrdili nomináciu. Súťaž bez ringu je ukončená.';
    $q.notify({ type: 'positive', message: doneMsg, position: 'top' });
    cats.value = [];
    evaluationMap.value = new Map();
    nominatedCatId.value = null;
    await compStore.fetchAll();
    await loadData();
  } catch (err: unknown) {
    console.error('Failed to confirm nomination:', err);
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'Potvrdenie nominácie sa nepodarilo. Skúste znova.';
    $q.notify({ type: 'negative', message: msg, position: 'top' });
  }
};
</script>

<style scoped>
.protocol-group-toggle :deep(.q-btn-group) {
  flex-wrap: wrap;
}

.protocol-group-toggle :deep(.q-btn) {
  flex: 1 1 140px;
  min-width: 140px;
}

.nomination-page {
  padding: 1.5rem;
  padding-bottom: 100px;
}

.call-next-steward-btn {
  border-radius: 0.5rem;
  background: #030213 !important;
  color: #fff !important;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.page-container {
  max-width: 900px;
  margin: 0 auto;
}

.main-card {
  border-radius: 0.875rem;
}

.header-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.header-icon {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: 1.25rem;
  color: #0a0a0a;
}

.badges-row {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
}

.nombis-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.badge-icon {
  width: 14px;
  height: 14px;
}

/* Cat Cards Grid */
.cats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.cat-card {
  position: relative;
  border-radius: 0.875rem;
  padding: 1.5rem 1rem;
  text-align: center;
  cursor: pointer;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: transform 0.15s ease;
}

.cat-card:hover {
  transform: scale(1.02);
}

.crown-icon {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 32px;
  height: 32px;
}

.cat-card--self-steward {
  min-height: 180px;
  justify-content: flex-start;
}

.cat-card--self-steward .cat-number {
  margin-top: 0;
}

.nomination-self-steward-slot {
  width: 100%;
  max-width: 100%;
  margin-top: auto;
  padding-top: 0.625rem;
  box-sizing: border-box;
  flex-shrink: 0;
  pointer-events: none;
}

.nomination-self-steward-slot :deep(.judge-steward-chip) {
  pointer-events: auto;
  width: 100%;
}

.card-unrated {
  background: white;
  border: 1px solid #e5e7eb;
}

.card-ex1 {
  background: #fefce8;
  border: 2px solid #f0b100;
}

.card-ex2 {
  background: #fff7ed;
  border: 2px solid #f97316;
}

.card-ex3 {
  background: #eff6ff;
  border: 2px solid #2b7fff;
}

.card-vg {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.cat-number {
  font-size: 2.5rem;
  color: #0a0a0a;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.badges-container {
  margin-bottom: 0.5rem;
}

.grade-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.titles-container {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  justify-content: center;
}

.title-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

/* Bottom Bar */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 3px solid #f0b100;
  padding: 1rem 1.5rem;
  z-index: 100;
}

.bottom-bar-content {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nombis-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fefce8;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.bottom-icon {
  width: 24px;
  height: 24px;
}

.nombis-label {
  font-size: 0.875rem;
  color: #666;
}

.nombis-cat {
  font-size: 0.875rem;
  color: #f0b100;
}

.bottom-bar-actions {
  display: flex;
  gap: 0.75rem;
}

.change-btn,
.confirm-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}

.btn-icon {
  width: 18px;
  height: 18px;
  margin-right: 0.5rem;
}

.btn-icon-white {
  filter: brightness(0) invert(1);
}

/* Modals */
.judging-modal,
.nombis-modal {
  width: 100%;
  max-width: 400px;
  border-radius: 0.875rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0;
}

.modal-header-icon {
  width: 24px;
  height: 24px;
}

.modal-title {
  font-size: 1.125rem;
  color: #0a0a0a;
}

.modal-content {
  padding-top: 0;
}

.cat-info-section {
  text-align: center;
}

.info-label {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.5rem;
}

.info-value {
  font-size: 1rem;
  color: #0a0a0a;
}

.selection-section {
  margin-bottom: 1rem;
}

.section-title {
  font-size: 0.875rem;
  color: #0a0a0a;
  text-align: center;
  margin-bottom: 0.75rem;
}

.grade-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.grade-btn {
  border-radius: 0.25rem;
}

.title-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.title-btn {
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.nombis-btn {
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon-small {
  width: 18px;
  height: 18px;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0;
}

.action-btn {
  flex: 1;
  border-radius: 0.25rem;
}

/* NomBIS Modal */
.nombis-subtitle {
  text-align: center;
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.eligible-cats-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}

.eligible-cat-card {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eligible-cat-card:hover {
  border-color: #d4d4d4;
}

.eligible-cat-card.selected {
  background: #fefce8;
  border-color: #f0b100;
}

.eligible-cat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.eligible-cat-badges {
  display: flex;
  gap: 0.25rem;
}

.id-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.grade-badge-small {
  padding: 0.25rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.selected-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.eligible-cat-info {
  margin-bottom: 0.25rem;
}

.eligible-cat-name {
  font-size: 0.875rem;
  color: #0a0a0a;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.cat-crown-icon {
  width: 16px;
  height: 16px;
}

.eligible-cat-breed {
  font-size: 0.75rem;
  color: #666;
}

.eligible-cat-titles {
  display: flex;
  gap: 0.25rem;
}

.title-badge-small {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 600px) {
  .cats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .cat-number {
    font-size: 2rem;
  }

  .bottom-bar-content {
    flex-direction: column;
    gap: 1rem;
  }

  .nombis-info {
    width: 100%;
  }
}
</style>
