<template>
  <q-card>
    <q-card-section>
      <div class="row items-center q-gutter-sm q-mb-xs">
        <q-icon name="rule" size="20px" />
        <div class="section-title">Hodnotenia a triedy</div>
      </div>

      <q-tabs v-model="innerTab" align="justify" inline-label dense class="taxonomy-tabs">
        <q-tab name="grades" icon="grade" label="Hodnotenia" />
        <q-tab name="titles" icon="emoji_events" label="Tituly" />
        <q-tab name="classes" icon="category" label="Triedy" />
      </q-tabs>

      <q-separator class="q-mb-md" />

      <!-- GRADES -->
      <div v-if="innerTab === 'grades'">
        <q-table
          :rows="taxStore.grades"
          :columns="gradeColumns"
          row-key="id"
          flat
          dense
          hide-bottom
          :rows-per-page-options="[0]"
        >
          <template v-slot:body-cell-farba="props">
            <q-td :props="props">
              <q-badge :color="quasarColorBySortOrder(props.row.sortOrder)" outline>
                #{{ props.row.sortOrder }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-counts="props">
            <q-td :props="props">
              <q-icon
                :name="props.row.countsAsAccepted ? 'check_circle' : 'remove_circle'"
                :color="props.row.countsAsAccepted ? 'positive' : 'grey-5'"
                size="18px"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-eligible="props">
            <q-td :props="props">
              <q-icon
                :name="props.row.eligibleForNomBis ? 'check_circle' : 'remove_circle'"
                :color="props.row.eligibleForNomBis ? 'positive' : 'grey-5'"
                size="18px"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn flat dense round icon="edit" size="sm" @click="openGradeEdit(props.row)" />
              <q-btn flat dense round icon="delete" color="negative" size="sm" @click="deleteGrade(props.row)" />
            </q-td>
          </template>
        </q-table>
        <div class="row justify-end q-mt-sm">
          <q-btn unelevated color="primary" icon="add" no-caps label="Pridať hodnotenie" @click="openGradeEdit(null)" />
        </div>
      </div>

      <!-- TITLES -->
      <div v-if="innerTab === 'titles'">
        <q-table
          :rows="taxStore.titles"
          :columns="titleColumns"
          row-key="id"
          flat
          dense
          hide-bottom
          :rows-per-page-options="[0]"
        >
          <template v-slot:body-cell-farba="props">
            <q-td :props="props">
              <q-badge :color="quasarColorBySortOrder(props.row.sortOrder)" outline>
                #{{ props.row.sortOrder }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-classes="props">
            <q-td :props="props">
              <span v-if="props.row.classCodes.length === 0" class="text-grey-6 text-caption">
                bez obmedzenia
              </span>
              <q-badge
                v-for="c in props.row.classCodes"
                :key="c"
                outline
                color="primary"
                class="q-mr-xs"
              >
                {{ c }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn flat dense round icon="edit" size="sm" @click="openTitleEdit(props.row)" />
              <q-btn flat dense round icon="delete" color="negative" size="sm" @click="deleteTitle(props.row)" />
            </q-td>
          </template>
        </q-table>
        <div class="row justify-end q-mt-sm">
          <q-btn unelevated color="primary" icon="add" no-caps label="Pridať titul" @click="openTitleEdit(null)" />
        </div>
      </div>

      <!-- CLASSES -->
      <div v-if="innerTab === 'classes'">
        <q-table
          :rows="taxStore.classes"
          :columns="classColumns"
          row-key="id"
          flat
          dense
          hide-bottom
          :rows-per-page-options="[0]"
        >
          <template v-slot:body-cell-farba="props">
            <q-td :props="props">
              <q-badge :color="quasarColorBySortOrder(props.row.sortOrder)" outline>
                #{{ props.row.sortOrder }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-flags="props">
            <q-td :props="props">
              <q-badge v-if="props.row.isNeuter" color="deep-purple-5" class="q-mr-xs">kastrát</q-badge>
              <q-badge v-if="props.row.isKittenOrJunior" color="pink-5" class="q-mr-xs">mladý</q-badge>
              <q-badge v-if="props.row.isSeparateBisCategory" outline color="green-7">vlastná BIS</q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-age="props">
            <q-td :props="props">
              <span v-if="props.row.minAgeMonths == null && props.row.maxAgeMonths == null"
                class="text-grey-6 text-caption">—</span>
              <span v-else>
                {{ props.row.minAgeMonths ?? '?' }} – {{ props.row.maxAgeMonths ?? '?' }} mes.
              </span>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn flat dense round icon="edit" size="sm" @click="openClassEdit(props.row)" />
              <q-btn flat dense round icon="delete" color="negative" size="sm" @click="deleteClass(props.row)" />
            </q-td>
          </template>
        </q-table>
        <div class="row justify-end q-mt-sm">
          <q-btn unelevated color="primary" icon="add" no-caps label="Pridať triedu" @click="openClassEdit(null)" />
        </div>
      </div>
    </q-card-section>

    <!-- Grade dialog -->
    <q-dialog v-model="gradeDialog" persistent>
      <q-card style="min-width: 360px; max-width: 480px">
        <q-card-section>
          <div class="text-h6">{{ editingGrade?.id ? 'Upraviť hodnotenie' : 'Nové hodnotenie' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="gradeForm.code" label="Kód *" hint="napr. EX1, VG, G" outlined dense />
          <q-input v-model="gradeForm.name" label="Plný názov" outlined dense />
          <q-toggle v-model="gradeForm.countsAsAccepted" label="Počíta sa ako prijaté pre postup" />
          <q-toggle v-model="gradeForm.eligibleForNomBis" label="Vhodné pre NomBIS" />
          <q-input v-model.number="gradeForm.sortOrder" type="number" label="Poradie" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Zrušiť" v-close-popup />
          <q-btn unelevated color="primary" label="Uložiť" @click="saveGrade" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Title dialog -->
    <q-dialog v-model="titleDialog" persistent>
      <q-card style="min-width: 380px; max-width: 520px">
        <q-card-section>
          <div class="text-h6">{{ editingTitle?.id ? 'Upraviť titul' : 'Nový titul' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="titleForm.code" label="Kód *" hint="napr. CAC, CACIB, CAP" outlined dense />
          <q-input v-model="titleForm.name" label="Plný názov" outlined dense />
          <q-input v-model="titleForm.description" label="Popis" type="textarea" autogrow outlined dense />
          <q-select
            v-model="titleForm.classCodes"
            :options="classCodeOptions"
            label="Pre ktoré triedy"
            multiple
            use-chips
            use-input
            new-value-mode="add-unique"
            outlined
            dense
            hint="prázdne = bez obmedzenia, voľný text povolený"
          />
          <q-input v-model.number="titleForm.sortOrder" type="number" label="Poradie (určuje farbu badge v aplikácii)" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Zrušiť" v-close-popup />
          <q-btn unelevated color="primary" label="Uložiť" @click="saveTitle" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Class dialog -->
    <q-dialog v-model="classDialog" persistent>
      <q-card style="min-width: 380px; max-width: 520px">
        <q-card-section>
          <div class="text-h6">{{ editingClass?.id ? 'Upraviť triedu' : 'Nová trieda' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="classForm.code" label="Kód *" hint="napr. OPEN, CHA, JUN" outlined dense />
          <q-input v-model="classForm.name" label="Názov *" outlined dense />
          <q-input v-model="classForm.description" label="Popis" type="textarea" autogrow outlined dense />
          <div class="row q-gutter-sm">
            <q-input v-model.number="classForm.minAgeMonths" type="number" label="Min vek (mes.)"
                     outlined dense class="col" />
            <q-input v-model.number="classForm.maxAgeMonths" type="number" label="Max vek (mes.)"
                     outlined dense class="col" />
          </div>
          <q-toggle v-model="classForm.isNeuter" label="Kastrátska trieda" />
          <q-toggle v-model="classForm.isKittenOrJunior" label="Mladá kategória (Kitten/Junior)" />
          <q-toggle v-model="classForm.isSeparateBisCategory"
                    label="Samostatná BIS kategória (Best Junior, Best Kitten ...)" />
          <q-input v-model.number="classForm.sortOrder" type="number" label="Poradie" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Zrušiť" v-close-popup />
          <q-btn unelevated color="primary" label="Uložiť" @click="saveClass" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar, type QTableProps } from 'quasar';
import { api } from 'src/boot/axios';
import { quasarColorBySortOrder } from 'src/utils/taxonomy_colors';
import {
  useWcfTaxonomyStore,
  type WcfGrade,
  type WcfTitle,
  type WcfClass,
} from 'src/stores/wcf_taxonomy';
import axios from 'axios';

const props = defineProps<{ competitionId: number }>();

const $q = useQuasar();
const taxStore = useWcfTaxonomyStore();

const innerTab = ref<'grades' | 'titles' | 'classes'>('grades');

onMounted(async () => {
  if (Number.isFinite(props.competitionId)) {
    await taxStore.loadAll(props.competitionId, { force: true });
  }
});

watch(
  () => props.competitionId,
  async (id) => {
    if (Number.isFinite(id)) {
      await taxStore.loadAll(id, { force: true });
    }
  },
);

const gradeColumns: QTableProps['columns'] = [
  { name: 'code', label: 'Kód', field: 'code', align: 'left' },
  { name: 'name', label: 'Názov', field: 'name', align: 'left' },
  { name: 'farba', label: 'Farba', field: 'sortOrder', align: 'left' },
  { name: 'counts', label: 'Prijaté', field: 'countsAsAccepted', align: 'center' },
  { name: 'eligible', label: 'NomBIS', field: 'eligibleForNomBis', align: 'center' },
  { name: 'sortOrder', label: 'Poradie', field: 'sortOrder', align: 'right' },
  { name: 'actions', label: '', field: () => '', align: 'right' },
];

const titleColumns: QTableProps['columns'] = [
  { name: 'code', label: 'Kód', field: 'code', align: 'left' },
  { name: 'name', label: 'Názov', field: 'name', align: 'left' },
  { name: 'farba', label: 'Farba', field: 'sortOrder', align: 'left' },
  { name: 'classes', label: 'Triedy', field: 'classCodes', align: 'left' },
  { name: 'sortOrder', label: 'Poradie', field: 'sortOrder', align: 'right' },
  { name: 'actions', label: '', field: () => '', align: 'right' },
];

const classColumns: QTableProps['columns'] = [
  { name: 'code', label: 'Kód', field: 'code', align: 'left' },
  { name: 'name', label: 'Názov', field: 'name', align: 'left' },
  { name: 'farba', label: 'Farba', field: 'sortOrder', align: 'left' },
  { name: 'age', label: 'Vek', field: () => '', align: 'left' },
  { name: 'flags', label: 'Vlastnosti', field: () => '', align: 'left' },
  { name: 'sortOrder', label: 'Poradie', field: 'sortOrder', align: 'right' },
  { name: 'actions', label: '', field: () => '', align: 'right' },
];

const classCodeOptions = computed(() => taxStore.classes.map((c) => c.code));

// ----- Grade form -----
const gradeDialog = ref(false);
const editingGrade = ref<WcfGrade | null>(null);
const gradeForm = ref({
  code: '',
  name: '',
  countsAsAccepted: false,
  eligibleForNomBis: false,
  sortOrder: 0,
});

function openGradeEdit(g: WcfGrade | null) {
  editingGrade.value = g;
  gradeForm.value = {
    code: g?.code ?? '',
    name: g?.name ?? '',
    countsAsAccepted: g?.countsAsAccepted ?? false,
    eligibleForNomBis: g?.eligibleForNomBis ?? false,
    sortOrder: g?.sortOrder ?? 0,
  };
  gradeDialog.value = true;
}

async function saveGrade() {
  const payload = {
    code: gradeForm.value.code.trim(),
    name: gradeForm.value.name.trim() || null,
    countsAsAccepted: gradeForm.value.countsAsAccepted,
    eligibleForNomBis: gradeForm.value.eligibleForNomBis,
    sortOrder: Number.isFinite(gradeForm.value.sortOrder) ? gradeForm.value.sortOrder : 0,
  };
  if (!payload.code) {
    $q.notify({ type: 'warning', message: 'Kód je povinný.', position: 'top' });
    return;
  }
  try {
    if (editingGrade.value?.id) {
      await api.put(`/competitions/${props.competitionId}/grades/${editingGrade.value.id}`, payload);
    } else {
      await api.post(`/competitions/${props.competitionId}/grades`, payload);
    }
    await taxStore.reloadGrades(props.competitionId);
    gradeDialog.value = false;
    $q.notify({ type: 'positive', message: 'Hodnotenie uložené', position: 'top' });
  } catch (err) {
    notifyError(err, 'Chyba pri ukladaní hodnotenia');
  }
}

function deleteGrade(g: WcfGrade) {
  $q.dialog({
    title: 'Odstrániť hodnotenie',
    message: `Naozaj chcete odstrániť „${g.code}“?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${props.competitionId}/grades/${g.id}`);
        await taxStore.reloadGrades(props.competitionId);
        $q.notify({ type: 'positive', message: 'Odstránené', position: 'top' });
      } catch (err) {
        notifyError(err, 'Nepodarilo sa odstrániť');
      }
    })();
  });
}

// ----- Title form -----
const titleDialog = ref(false);
const editingTitle = ref<WcfTitle | null>(null);
const titleForm = ref({
  code: '',
  name: '',
  description: '',
  classCodes: [] as string[],
  sortOrder: 0,
});

function openTitleEdit(t: WcfTitle | null) {
  editingTitle.value = t;
  titleForm.value = {
    code: t?.code ?? '',
    name: t?.name ?? '',
    description: t?.description ?? '',
    classCodes: t ? [...t.classCodes] : [],
    sortOrder: t?.sortOrder ?? 0,
  };
  titleDialog.value = true;
}

async function saveTitle() {
  const payload = {
    code: titleForm.value.code.trim(),
    name: titleForm.value.name.trim() || null,
    description: titleForm.value.description.trim() || null,
    classCodes: titleForm.value.classCodes.map((c) => c.trim()).filter((c) => c.length > 0),
    sortOrder: Number.isFinite(titleForm.value.sortOrder) ? titleForm.value.sortOrder : 0,
  };
  if (!payload.code) {
    $q.notify({ type: 'warning', message: 'Kód je povinný.', position: 'top' });
    return;
  }
  try {
    if (editingTitle.value?.id) {
      await api.put(`/competitions/${props.competitionId}/titles/${editingTitle.value.id}`, payload);
    } else {
      await api.post(`/competitions/${props.competitionId}/titles`, payload);
    }
    await taxStore.reloadTitles(props.competitionId);
    titleDialog.value = false;
    $q.notify({ type: 'positive', message: 'Titul uložený', position: 'top' });
  } catch (err) {
    notifyError(err, 'Chyba pri ukladaní titulu');
  }
}

function deleteTitle(t: WcfTitle) {
  $q.dialog({
    title: 'Odstrániť titul',
    message: `Naozaj chcete odstrániť „${t.code}“?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${props.competitionId}/titles/${t.id}`);
        await taxStore.reloadTitles(props.competitionId);
        $q.notify({ type: 'positive', message: 'Odstránené', position: 'top' });
      } catch (err) {
        notifyError(err, 'Nepodarilo sa odstrániť');
      }
    })();
  });
}

// ----- Class form -----
const classDialog = ref(false);
const editingClass = ref<WcfClass | null>(null);
const classForm = ref({
  code: '',
  name: '',
  description: '',
  minAgeMonths: null as number | null,
  maxAgeMonths: null as number | null,
  isNeuter: false,
  isKittenOrJunior: false,
  isSeparateBisCategory: false,
  sortOrder: 0,
});

function openClassEdit(c: WcfClass | null) {
  editingClass.value = c;
  classForm.value = {
    code: c?.code ?? '',
    name: c?.name ?? '',
    description: c?.description ?? '',
    minAgeMonths: c?.minAgeMonths ?? null,
    maxAgeMonths: c?.maxAgeMonths ?? null,
    isNeuter: c?.isNeuter ?? false,
    isKittenOrJunior: c?.isKittenOrJunior ?? false,
    isSeparateBisCategory: c?.isSeparateBisCategory ?? false,
    sortOrder: c?.sortOrder ?? 0,
  };
  classDialog.value = true;
}

async function saveClass() {
  const payload = {
    code: classForm.value.code.trim(),
    name: classForm.value.name.trim(),
    description: classForm.value.description.trim() || null,
    minAgeMonths: classForm.value.minAgeMonths,
    maxAgeMonths: classForm.value.maxAgeMonths,
    isNeuter: classForm.value.isNeuter,
    isKittenOrJunior: classForm.value.isKittenOrJunior,
    isSeparateBisCategory: classForm.value.isSeparateBisCategory,
    sortOrder: Number.isFinite(classForm.value.sortOrder) ? classForm.value.sortOrder : 0,
  };
  if (!payload.code || !payload.name) {
    $q.notify({ type: 'warning', message: 'Kód a názov sú povinné.', position: 'top' });
    return;
  }
  try {
    if (editingClass.value?.id) {
      await api.put(`/competitions/${props.competitionId}/classes/${editingClass.value.id}`, payload);
    } else {
      await api.post(`/competitions/${props.competitionId}/classes`, payload);
    }
    await taxStore.reloadClasses(props.competitionId);
    classDialog.value = false;
    $q.notify({ type: 'positive', message: 'Trieda uložená', position: 'top' });
  } catch (err) {
    notifyError(err, 'Chyba pri ukladaní triedy');
  }
}

function deleteClass(c: WcfClass) {
  $q.dialog({
    title: 'Odstrániť triedu',
    message: `Naozaj chcete odstrániť „${c.code}“?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${props.competitionId}/classes/${c.id}`);
        await taxStore.reloadClasses(props.competitionId);
        $q.notify({ type: 'positive', message: 'Odstránené', position: 'top' });
      } catch (err) {
        notifyError(err, 'Nepodarilo sa odstrániť');
      }
    })();
  });
}

function notifyError(err: unknown, fallback: string) {
  const serverMsg =
    axios.isAxiosError(err) && typeof err.response?.data === 'object' && err.response?.data !== null
      ? (err.response.data as { message?: string }).message
      : undefined;
  $q.notify({
    type: 'negative',
    message: typeof serverMsg === 'string' && serverMsg.length > 0 ? serverMsg : fallback,
    position: 'top',
  });
}
</script>

<style scoped>
.section-title {
  font-weight: 600;
  font-size: 1.05rem;
}
.section-subtitle {
  color: #64748b;
  font-size: 0.875rem;
}
.taxonomy-tabs {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
</style>
