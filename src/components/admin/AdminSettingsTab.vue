<template>
  <div class="row q-col-gutter-md items-stretch">
    <div class="col-12 col-md-6">
      <q-card class="full-height">
        <q-card-section>
          <div class="row items-center q-gutter-sm q-mb-md">
            <q-icon name="settings" size="20px" />
            <div class="section-title">Nastavenia súťaže</div>
          </div>

          <div class="q-mb-md">
            <div class="field-label">Názov súťaže</div>
            <q-input
              v-model="ctx.settingsMeta.value.name"
              dense
              outlined
              class="settings-select"
              @blur="onMetaBlur"
            />
          </div>

          <div class="q-mb-md">
            <div class="field-label">Dátum súťaže</div>
            <q-input
              v-model="ctx.settingsMeta.value.date"
              type="date"
              dense
              outlined
              class="settings-select"
              @blur="onMetaBlur"
            />
          </div>

          <div class="q-mb-md">
            <div class="field-label">Lokácia</div>
            <q-input
              v-model="ctx.settingsMeta.value.location"
              dense
              outlined
              placeholder="Napr. Bratislava, Incheba"
              class="settings-select"
              @blur="onMetaBlur"
            />
          </div>

          <div class="q-mb-md">
            <div class="field-label">Popis</div>
            <q-input
              v-model="ctx.settingsMeta.value.description"
              type="textarea"
              autogrow
              :rows="3"
              dense
              outlined
              placeholder="Krátky popis súťaže"
              class="settings-select"
              @blur="onMetaBlur"
            />
          </div>

          <div class="q-mb-md">
            <div class="field-label">Stav súťaže</div>
            <q-select
              v-model="ctx.settings.value.status"
              :options="statusOptions"
              dense
              outlined
              emit-value
              map-options
              class="settings-select"
            />
          </div>

          <div class="q-mb-md">
            <q-toggle
              v-model="ctx.settings.value.published"
              label="Publikovaná (viditeľná pre všetkých)"
              color="primary"
            />
          </div>

          <div class="q-mb-md">
            <div class="field-label">Aktuálne kolo</div>
            <q-select
              v-model="ctx.settings.value.currentRound"
              :options="availableRounds"
              dense
              outlined
              emit-value
              map-options
              class="settings-select"
            />
          </div>

          <q-separator class="q-my-md" />

          <div class="row justify-end">
            <q-btn
              outline
              color="negative"
              icon="delete_forever"
              label="Odstrániť súťaž"
              no-caps
              @click="confirmDeleteCompetition"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div class="col-12 col-md-6">
      <WcfTaxonomySection
        v-if="ctx.competitionId.value"
        :competition-id="ctx.competitionId.value"
        class="full-height"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import axios from 'axios';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { api } from 'src/boot/axios';
import WcfTaxonomySection from 'src/components/WcfTaxonomySection.vue';
import { useAdminCompetition } from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();
const $q = useQuasar();
const router = useRouter();

const statusOptions = [
  { label: 'Ešte nezačala', value: 'scheduled' },
  { label: 'Prebieha', value: 'active' },
  { label: 'Pozastavená', value: 'paused' },
  { label: 'Ukončená', value: 'finished' },
];

const allRounds = [
  { label: 'Nominácia', value: 'nomination' },
  { label: 'Ring 1', value: 'ring1' },
  { label: 'Ring 2', value: 'ring2' },
  { label: 'BIS / Finále', value: 'bis' },
];

const availableRounds = computed(() => [
  { label: 'Neurčené', value: '' },
  ...allRounds.filter((r) => ctx.settings.value.roundsEnabled.includes(r.value)),
]);

function onMetaBlur() {
  void ctx.saveCompetitionMeta();
}

function confirmDeleteCompetition() {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odstrániť súťaž',
    message:
      'Naozaj chcete odstrániť túto súťaž? Odstránia sa aj všetky súvisiace dáta (mačky, hodnotenia, poradie, role).',
    cancel: true,
    persistent: true,
    ok: {
      label: 'Odstrániť',
      color: 'negative',
      unelevated: true,
      noCaps: true,
    },
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${ctx.competitionId.value}`);
        ctx.notify({ type: 'positive', message: 'Súťaž bola odstránená.' });
        await router.push('/');
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
            ? err.response.data.message
            : 'Súťaž sa nepodarilo odstrániť.';
        ctx.notify({ type: 'negative', message: msg });
      }
    })();
  });
}
</script>

<style scoped>
.section-title {
  font-weight: 600;
  font-size: 14px;
}
.section-subtitle {
  font-size: 12px;
  color: #666;
}
.field-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  margin-bottom: 4px;
}
.settings-select {
  font-size: 13px;
}
</style>
