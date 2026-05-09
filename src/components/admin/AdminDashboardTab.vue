<template>
  <div>
    <div class="row q-col-gutter-md q-mb-lg items-stretch">
      <div class="col-12">
        <q-card class="full-height">
          <q-card-section>
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="bar_chart" size="20px" />
              <div class="section-title">Priebeh súťaže</div>
            </div>

            <div class="row items-center justify-between q-mb-xs">
              <div class="detail-label">Celkový progress</div>
              <div class="detail-label">{{ ctx.overallProgress.value }}%</div>
            </div>
            <q-linear-progress
              :value="ctx.overallProgress.value / 100"
              color="dark"
              track-color="grey-3"
              rounded
              size="8px"
              class="q-mb-md"
            />

            <div class="row items-center justify-between q-mb-sm">
              <div class="detail-label">Aktuálne kolo:</div>
              <q-badge outline color="dark" text-color="dark" class="info-badge">
                {{ currentRoundLabel }}
              </q-badge>
            </div>
            <div class="row items-center justify-between q-mb-sm">
              <div class="detail-label">Publikovaná:</div>
              <q-badge
                :color="ctx.competition.value.published ? 'green' : 'grey'"
                text-color="white"
                class="info-badge"
              >
                {{ ctx.competition.value.published ? 'Áno' : 'Nie' }}
              </q-badge>
            </div>
            <div class="row items-center justify-between">
              <div class="detail-label">Stav:</div>
              <q-badge color="dark" text-color="white" class="info-badge">
                {{ statusLabel }}
              </q-badge>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12">
        <q-card class="full-height">
          <q-card-section>
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="emoji_events" size="20px" color="amber-8" />
              <div class="section-title">Stav skupín</div>
            </div>

            <div v-for="group in ctx.groups.value" :key="group.name" class="q-mb-sm">
              <div class="row items-center justify-between q-mb-xs">
                <div class="detail-label">{{ group.name }}</div>
                <div class="detail-label">{{ group.progress }}%</div>
              </div>
              <q-linear-progress
                :value="group.progress / 100"
                :color="group.progress > 0 ? 'dark' : 'grey-4'"
                track-color="grey-3"
                rounded
                size="6px"
              />
              <div v-if="group.currentCat" class="current-cat-label">
                <q-icon name="emoji_events" size="14px" color="amber-8" class="q-mr-xs" />
                {{ group.currentCat }}
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card>
      <q-card-section>
        <div class="row items-center q-gutter-sm q-mb-md">
          <q-icon name="person" size="20px" />
          <div class="section-title">Rozhodcovia</div>
        </div>

        <div v-if="ctx.judges.value.length === 0" class="text-grey-6 text-body2">
          Žiadni rozhodcovia
        </div>

        <div v-for="judge in ctx.judges.value" :key="judge.id" class="q-mb-sm">
          <div class="detail-label">{{ judge.name }}</div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  ROUND_LABEL_MAP,
  STATUS_LABEL_MAP,
  useAdminCompetition,
} from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();

const statusLabel = computed(
  () => STATUS_LABEL_MAP[ctx.competition.value.status] || ctx.competition.value.status,
);
const currentRoundLabel = computed(() => {
  const r = ctx.competition.value.currentRound;
  if (!r) return 'Neurčené';
  return ROUND_LABEL_MAP[r] || r;
});
</script>

<style scoped>
.section-title {
  font-weight: 600;
  font-size: 14px;
}
.detail-label {
  font-size: 13px;
  color: #555;
}
.info-badge {
  font-size: 11px;
  padding: 2px 8px;
}
.current-cat-label {
  font-size: 12px;
  color: #b8860b;
  margin-top: 2px;
}
</style>
