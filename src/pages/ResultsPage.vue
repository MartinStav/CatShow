<template>
  <q-page class="results-page">
    <div class="page-container screen-only">
      <div v-if="loading" class="text-center q-pa-xl">
        <q-spinner-dots size="44px" color="primary" />
        <div class="text-body2 text-grey-7 q-mt-md">Načítavam výsledky...</div>
      </div>

      <q-banner v-else-if="errorMessage" rounded class="bg-negative text-white">
        {{ errorMessage }}
      </q-banner>

      <template v-else-if="results">
        <q-card class="main-card q-mb-lg">
          <q-card-section class="text-center q-pa-xl">
            <div class="row items-center justify-center q-gutter-sm q-mb-sm">
              <q-icon name="emoji_events" size="34px" color="amber-8" />
              <div class="text-h4 text-weight-bold">{{ results.competition.name }}</div>
            </div>
            <div class="text-body1 text-grey-7">
              <span>{{ formattedDate }}</span>
              <span v-if="results.competition.location"> · {{ results.competition.location }}</span>
            </div>
            <div v-if="results.competition.description" class="text-body2 text-grey-8 q-mt-md">
              {{ results.competition.description }}
            </div>
          </q-card-section>
        </q-card>

        <div class="row q-col-gutter-md q-mb-lg">
          <div v-for="card in summaryCards" :key="card.label" class="col-6 col-md-2">
            <q-card flat bordered class="summary-card">
              <q-card-section>
                <q-icon :name="card.icon" :color="card.color" size="28px" />
                <div class="text-h5 text-weight-bold q-mt-sm">{{ card.value }}</div>
                <div class="text-caption text-grey-7">{{ card.label }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-card class="q-mb-lg">
          <q-card-section>
            <div class="section-title">
              <q-icon name="workspace_premium" color="amber-8" size="24px" />
              <span>BIS / BIV / NomBIS</span>
            </div>

            <q-tabs v-model="activeAwardTab" align="justify" dense class="q-mb-md">
              <q-tab name="BIS" icon="workspace_premium" label="BIS" />
              <q-tab name="BIV" icon="emoji_events" label="BIV" />
              <q-tab name="NOM_BIS" icon="star" label="NomBIS" />
            </q-tabs>

            <q-separator class="q-mb-md" />

            <div v-if="activeAwards.length === 0" class="empty-state">
              Zatiaľ tu nie sú žiadne záznamy.
            </div>
            <div v-else class="award-grid">
              <q-card v-for="award in activeAwards" :key="award.id" flat bordered class="award-card">
                <q-card-section>
                  <div class="row items-start justify-between q-gutter-sm">
                    <div>
                      <q-badge :color="awardColor(award.level)" class="q-mb-sm">
                        {{ awardLabel(award.level) }}
                      </q-badge>
                      <div class="text-h6 text-weight-bold">{{ award.cat.name }}</div>
                      <div class="text-body2 text-grey-7">
                        {{ award.cat.registrationNumber }} · {{ award.cat.breed }}
                      </div>
                    </div>
                    <q-badge v-if="award.position" outline color="grey-8">#{{ award.position }}</q-badge>
                  </div>
                  <div class="meta-line q-mt-md">
                    <span v-if="award.category">{{ award.category }}</span>
                    <span v-if="award.sex">{{ award.sex }}</span>
                    <span v-if="award.classCode">{{ award.classCode }}</span>
                  </div>
                  <div v-if="award.judge" class="text-caption text-grey-7 q-mt-sm">
                    Rozhodca: {{ award.judge.name }}
                  </div>
                  <div v-if="award.notes" class="text-caption text-grey-8 q-mt-sm">
                    {{ award.notes }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-card-section>
        </q-card>

        <q-card>
          <q-card-section>
            <div class="section-title">
              <q-icon name="fact_check" color="primary" size="24px" />
              <span>Hodnotenia podľa fáz</span>
            </div>

            <q-tabs v-model="activeRoundTab" align="justify" dense class="q-mb-md">
              <q-tab
                v-for="round in roundsWithEvaluations"
                :key="round"
                :name="round"
                :label="roundLabel(round)"
              />
            </q-tabs>

            <q-separator class="q-mb-md" />

            <div v-if="activeRoundGroups.length === 0" class="empty-state">
              Pre túto fázu zatiaľ nie sú výsledky.
            </div>
            <div v-else>
              <div v-for="group in activeRoundGroups" :key="group.key" class="q-mb-md">
                <div class="group-title">{{ group.label }}</div>
                <div class="evaluation-list">
                  <div v-for="evaluation in group.rows" :key="evaluation.id" class="evaluation-row">
                    <div class="cat-index">
                      {{ evaluation.position ? evaluation.position : '·' }}
                    </div>
                    <div class="col">
                      <div class="text-weight-medium">{{ evaluation.cat.name }}</div>
                      <div class="text-caption text-grey-7">
                        {{ evaluation.cat.registrationNumber }} · {{ evaluation.cat.breed }}
                        <span v-if="evaluation.cat.class"> · {{ evaluation.cat.class }}</span>
                      </div>
                    </div>
                    <div class="result-badges">
                      <q-badge v-if="evaluation.grade" :color="gradeColor(evaluation.grade)">
                        {{ gradeLabel(evaluation.grade) }}
                      </q-badge>
                      <q-badge
                        v-for="title in evaluation.titles"
                        :key="title"
                        outline
                        :color="titleColor(title)"
                      >
                        {{ titleLabel(title) }}
                      </q-badge>
                      <q-badge v-if="evaluation.nomBis" color="amber-8" text-color="white">
                        NomBIS
                      </q-badge>
                      <q-badge v-if="evaluation.accepted" outline color="positive">
                        Postupuje
                      </q-badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';
import { quasarColorBySortOrder } from 'src/utils/taxonomy_colors';

type AwardLevel = 'BIV' | 'NOM_BIS' | 'BIS';
type RoundName = 'nomination' | 'ring1' | 'ring2' | 'bis';

interface ResultCat {
  id: number;
  registrationNumber: string;
  name: string;
  breed: string;
  group: string;
  groups: string[];
  class: string | null;
  sex: string | null;
  exhibitor: string | null;
}

interface EvaluationRow {
  id: number;
  cat: ResultCat;
  judge: { id: number; name: string } | null;
  round: RoundName;
  grade: string | null;
  titles: string[];
  position: number | null;
  accepted: boolean;
  nomBis: boolean;
}

interface AwardRow {
  id: number;
  level: AwardLevel;
  catId: number;
  cat: ResultCat;
  judge: { id: number; name: string } | null;
  category: string | null;
  sex: string | null;
  classCode: string | null;
  position: number;
  notes: string | null;
}

interface TaxonomyItem {
  id: number;
  code: string;
  name: string | null;
  sortOrder: number;
}

interface FullResults {
  competition: {
    id: number;
    name: string;
    date: string;
    location: string | null;
    description: string | null;
    status: string;
    currentRound: string | null;
  };
  summary: {
    totalCats: number;
    ratedCats: number;
    bisCount: number;
    bivCount: number;
    nomBisCount: number;
  };
  taxonomy: {
    grades: TaxonomyItem[];
    titles: TaxonomyItem[];
  };
  evaluations: EvaluationRow[];
  bisAwards: AwardRow[];
}

const route = useRoute();
const loading = ref(false);
const errorMessage = ref('');
const results = ref<FullResults | null>(null);
const activeAwardTab = ref<AwardLevel>('BIS');
const activeRoundTab = ref<RoundName>('nomination');

const competitionId = computed(() => Number(route.params.competitionId));

const formattedDate = computed(() => {
  const value = results.value?.competition.date;
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
});

const summaryCards = computed(() => {
  const summary = results.value?.summary;
  return [
    { label: 'Mačiek', value: summary?.totalCats ?? 0, icon: 'pets', color: 'primary' },
    { label: 'Ohodnotených', value: summary?.ratedCats ?? 0, icon: 'task_alt', color: 'positive' },
    { label: 'BIS', value: summary?.bisCount ?? 0, icon: 'workspace_premium', color: 'amber-8' },
    { label: 'BIV', value: summary?.bivCount ?? 0, icon: 'emoji_events', color: 'deep-orange' },
    { label: 'NomBIS', value: summary?.nomBisCount ?? 0, icon: 'star', color: 'amber' },
  ];
});

const activeAwards = computed(() =>
  (results.value?.bisAwards ?? [])
    .filter((award) => award.level === activeAwardTab.value)
    .sort((a, b) => a.position - b.position || (a.category ?? '').localeCompare(b.category ?? '')),
);

const roundsWithEvaluations = computed<RoundName[]>(() => {
  const preferred: RoundName[] = ['nomination', 'ring1', 'ring2', 'bis'];
  const present = new Set((results.value?.evaluations ?? []).map((row) => row.round));
  const rounds = preferred.filter((round) => present.has(round));
  return rounds.length > 0 ? rounds : ['nomination'];
});

const activeRoundGroups = computed(() => {
  const map = new Map<string, { key: string; label: string; rows: EvaluationRow[] }>();
  for (const row of results.value?.evaluations ?? []) {
    if (row.round !== activeRoundTab.value) continue;
    const label = row.cat.groups.length > 0 ? row.cat.groups.join(', ') : row.cat.group || 'Bez skupiny';
    const bucket = map.get(label) ?? { key: label, label, rows: [] };
    bucket.rows.push(row);
    map.set(label, bucket);
  }
  return Array.from(map.values())
    .map((group) => ({
      ...group,
      rows: group.rows.sort(
        (a, b) =>
          (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
          a.cat.registrationNumber.localeCompare(b.cat.registrationNumber),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

watch(roundsWithEvaluations, (rounds) => {
  if (!rounds.includes(activeRoundTab.value)) {
    activeRoundTab.value = rounds[0] ?? 'nomination';
  }
});

onMounted(() => {
  void loadResults();
});

async function loadResults() {
  if (!Number.isFinite(competitionId.value)) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.get<FullResults>(`/live/${competitionId.value}/full-results`);
    results.value = data;
    activeRoundTab.value = roundsWithEvaluations.value[0] ?? 'nomination';
  } catch (err) {
    const serverMsg =
      axios.isAxiosError(err) && typeof err.response?.data === 'object' && err.response.data !== null
        ? (err.response.data as { message?: string }).message
        : undefined;
    errorMessage.value = serverMsg ?? 'Výsledky sa nepodarilo načítať.';
  } finally {
    loading.value = false;
  }
}

function roundLabel(round: RoundName): string {
  const labels: Record<RoundName, string> = {
    nomination: 'Nominácia',
    ring1: 'Ring 1',
    ring2: 'Ring 2',
    bis: 'BIS',
  };
  return labels[round];
}

function awardLabel(level: AwardLevel): string {
  if (level === 'NOM_BIS') return 'NomBIS';
  return level;
}

function awardColor(level: AwardLevel): string {
  if (level === 'BIS') return 'amber-8';
  if (level === 'BIV') return 'deep-orange';
  return 'primary';
}

function gradeLabel(code: string): string {
  const item = results.value?.taxonomy.grades.find((grade) => grade.code === code);
  return item?.name ? `${code} · ${item.name}` : code;
}

function gradeColor(code: string): string {
  const item = results.value?.taxonomy.grades.find((grade) => grade.code === code);
  if (item) return quasarColorBySortOrder(item.sortOrder);
  return 'primary';
}

function titleLabel(code: string): string {
  const item = results.value?.taxonomy.titles.find((title) => title.code === code);
  return item?.name ? `${code} · ${item.name}` : code;
}

function titleColor(code: string): string {
  const item = results.value?.taxonomy.titles.find((title) => title.code === code);
  if (item) return quasarColorBySortOrder(item.sortOrder);
  return 'primary';
}
</script>

<style scoped>
.results-page {
  padding: 1.5rem;
}

.page-container {
  max-width: 1180px;
  margin: 0 auto;
}

.main-card,
.summary-card,
.award-card {
  border-radius: 0.875rem;
}

.summary-card {
  height: 100%;
  text-align: center;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.award-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  color: #475569;
  font-size: 0.85rem;
}

.meta-line span:not(:last-child)::after {
  content: "·";
  margin-left: 0.4rem;
}

.empty-state {
  text-align: center;
  color: #64748b;
  padding: 2rem;
}

.group-title {
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.5rem;
}

.evaluation-list {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}

.evaluation-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.evaluation-row:last-child {
  border-bottom: none;
}

.cat-index {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #f1f5f9;
  color: #334155;
  font-weight: 700;
}

.result-badges {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.35rem;
}

@media (max-width: 700px) {
  .evaluation-row {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .result-badges {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
