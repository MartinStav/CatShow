<template>
  <div>
    <div class="row q-col-gutter-md q-mb-lg items-stretch">
      <div class="col-12 col-md-6">
        <q-card class="full-height">
          <q-card-section>
            <div class="row items-center q-gutter-sm q-mb-xs">
              <q-icon name="file_download" size="20px" />
              <div class="section-title">Export dát</div>
            </div>
            <div class="section-subtitle q-mb-md">
              Exportujte aktuálne dáta súťaže do JSON súboru
            </div>

            <div class="field-label q-mb-sm">Režim exportu:</div>
            <q-option-group
              v-model="exportMode"
              :options="exportOptions"
              type="radio"
              color="primary"
              class="q-mb-md"
            />

            <q-btn
              unelevated
              color="dark"
              label="Exportovať dáta"
              icon="file_download"
              class="full-width export-btn"
              no-caps
              @click="handleExport"
            />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card class="full-height">
          <q-card-section>
            <div class="row items-center q-gutter-sm q-mb-xs">
              <q-icon name="file_upload" size="20px" />
              <div class="section-title">Import dát</div>
            </div>
            <div class="section-subtitle q-mb-md">
              Importujte dáta zo súboru JSON (nahradí existujúce dáta)
            </div>

            <div class="field-label q-mb-sm">JSON dáta</div>
            <q-input
              v-model="importJson"
              type="textarea"
              outlined
              dense
              placeholder='{ "competition": { … }, "users": [ … ], "groups": [ … ], "judges": [ … ], … }'
              :rows="6"
              class="q-mb-sm"
            />
            <q-btn
              unelevated
              color="dark"
              label="Importovať dáta"
              icon="file_upload"
              class="full-width export-btn"
              no-caps
              @click="handleImport"
            />
            <div v-if="importMessage" class="q-mt-sm text-positive text-caption">
              {{ importMessage }}
            </div>
            <div v-if="importError" class="q-mt-sm text-negative text-caption">
              {{ importError }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card>
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="row items-center q-gutter-sm">
            <q-icon name="code" size="20px" />
            <div class="section-title">Príklad formátu dát</div>
          </div>
          <q-btn
            flat
            dense
            no-caps
            color="dark"
            icon="content_copy"
            label="Skopírovať príklad"
            @click="copyJsonExample"
          />
        </div>
        <pre class="json-example">{{ jsonExample }}</pre>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { useAdminCompetition } from 'src/composables/useAdminCompetition';
import { ADMIN_IMPORT_EXAMPLE } from './adminImportExample';

const ctx = useAdminCompetition();
const $q = useQuasar();

const exportOptions = [
  { label: 'Iba štruktúra (nastavenia, skupiny, rozhodcovia)', value: 'structure' },
  { label: 'Mačky s vystavovateľmi', value: 'cats' },
  { label: 'Plná záloha (vrátane hodnotení)', value: 'full' },
];

const exportMode = ref('full');
const importJson = ref('');
const importMessage = ref('');
const importError = ref('');
const jsonExample = ADMIN_IMPORT_EXAMPLE;

async function handleExport() {
  if (!ctx.competitionId.value) return;
  try {
    const { data } = await api.get(`/competitions/${ctx.competitionId.value}/export`, {
      params: { mode: exportMode.value },
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competition-${ctx.competitionId.value}-${exportMode.value}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    ctx.notify({ type: 'negative', message: 'Export zlyhal' });
  }
}

async function handleImport() {
  if (!ctx.competitionId.value) return;
  importMessage.value = '';
  importError.value = '';
  try {
    const parsed = JSON.parse(importJson.value);
    await api.post(`/competitions/${ctx.competitionId.value}/import`, parsed);
    importMessage.value = 'Import úspešný!';
    importJson.value = '';
    await Promise.all([ctx.loadDashboard(), ctx.loadJudges(), ctx.loadSystemUsers()]);
  } catch (e: unknown) {
    if (e instanceof SyntaxError) {
      importError.value = 'Neplatný JSON formát.';
    } else if (axios.isAxiosError(e) && typeof e.response?.data?.message === 'string') {
      importError.value = e.response.data.message;
    } else {
      importError.value = 'Import zlyhal.';
    }
  }
}

async function copyJsonExample() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(jsonExample);
    } else if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = jsonExample;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    $q.notify({ type: 'positive', message: 'Príklad bol skopírovaný.', position: 'top' });
  } catch {
    $q.notify({ type: 'negative', message: 'Kopírovanie zlyhalo.', position: 'top' });
  }
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
}
.export-btn {
  border-radius: 6px;
}
.json-example {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  font-size: 11px;
  line-height: 1.45;
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
