<template>
  <div>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="section-title">Zoznam mačiek</div>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nová mačka"
            no-caps
            @click="openCatDialog(null)"
          />
        </div>

        <q-table
          :rows="ctx.cats.value"
          :columns="catColumns"
          row-key="id"
          flat
          :pagination="{ rowsPerPage: 0 }"
          hide-pagination
          class="cats-table"
        >
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="getCatStatusColor(props.row.status)"
                :outline="props.row.status === 'Čaká'"
                :text-color="getCatStatusTextColor(props.row.status)"
                class="status-badge"
              >
                {{ props.row.status }}
              </q-badge>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                dense
                icon="edit"
                color="primary"
                @click="openCatDialog(props.row)"
              />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="deleteCat(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showCatDialog">
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">{{ editingCat ? 'Upraviť mačku' : 'Nová mačka' }}</div>
        </q-card-section>
        <q-card-section>
          <q-form class="q-gutter-md" @submit="saveCat">
            <q-input
              v-model="catForm.registrationNumber"
              label="Registračné číslo"
              outlined
              dense
              :rules="[(val) => !!val || 'Povinné']"
            />
            <q-input
              v-model="catForm.name"
              label="Meno"
              outlined
              dense
              :rules="[(val) => !!val || 'Povinné']"
            />
            <q-input
              v-model="catForm.breed"
              label="Plemeno"
              outlined
              dense
              :rules="[(val) => !!val || 'Povinné']"
            />
            <q-select
              v-model="catForm.class"
              :options="classOptions"
              label="Trieda (WCF)"
              outlined
              dense
              emit-value
              map-options
              use-input
              new-value-mode="add-unique"
              hint="Otvorená, Šampión, Kitten ... alebo vlastný text"
              clearable
            />
            <q-select
              v-model="catForm.status"
              :options="statusOptions"
              label="Stav"
              outlined
              dense
              emit-value
              map-options
            />
            <q-select
              v-model="catForm.exhibitorId"
              :options="ctx.exhibitorOptions.value"
              label="Vystavovateľ (majiteľ)"
              outlined
              dense
              emit-value
              map-options
              :rules="[(val) => !!val || 'Mačka musí mať priradeného majiteľa']"
            />
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn v-close-popup flat label="Zrušiť" />
              <q-btn
                type="submit"
                color="primary"
                :label="editingCat ? 'Uložiť' : 'Vytvoriť'"
                :loading="catSaving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import axios from 'axios';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { useWcfTaxonomyStore } from 'src/stores/wcf_taxonomy';
import {
  getCatStatusColor,
  getCatStatusTextColor,
  useAdminCompetition,
  type CatEntry,
} from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();
const $q = useQuasar();
const taxStore = useWcfTaxonomyStore();

const catColumns = [
  { name: 'number', label: 'Číslo', field: 'number', align: 'left' as const, sortable: true },
  { name: 'name', label: 'Meno', field: 'name', align: 'left' as const, sortable: true },
  { name: 'breed', label: 'Plemeno', field: 'breed', align: 'left' as const, sortable: true },
  { name: 'catClass', label: 'Trieda', field: 'catClass', align: 'left' as const, sortable: true },
  {
    name: 'exhibitor',
    label: 'Vystavovateľ',
    field: 'exhibitor',
    align: 'left' as const,
    sortable: true,
  },
  { name: 'status', label: 'Stav', field: 'status', align: 'left' as const, sortable: true },
  { name: 'actions', label: 'Akcie', field: 'id', align: 'center' as const },
];

const statusOptions = [
  { label: 'Čaká', value: 'waiting' },
  { label: 'Volaná', value: 'called' },
  { label: 'Hodnotí sa', value: 'judging' },
  { label: 'Ohodnotená', value: 'completed' },
];

const showCatDialog = ref(false);
const editingCat = ref<CatEntry | null>(null);
const catForm = ref({
  registrationNumber: '',
  name: '',
  breed: '',
  class: null as string | null,
  status: 'waiting',
  exhibitorId: null as number | null,
});
const catSaving = ref(false);

const classOptions = computed(() =>
  taxStore.classes.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code })),
);

function openCatDialog(cat: CatEntry | null) {
  editingCat.value = cat;
  if (cat) {
    catForm.value = {
      registrationNumber: cat.number,
      name: cat.name,
      breed: cat.breed,
      class: cat.catClass,
      status: cat.backendStatus,
      exhibitorId: cat.exhibitorId,
    };
  } else {
    catForm.value = {
      registrationNumber: '',
      name: '',
      breed: '',
      class: null,
      status: 'waiting',
      exhibitorId: null,
    };
  }
  showCatDialog.value = true;
}

async function saveCat() {
  if (!ctx.competitionId.value) return;
  if (!catForm.value.exhibitorId) {
    ctx.notify({ type: 'warning', message: 'Vyberte vystavovateľa (majiteľa) mačky.' });
    return;
  }
  catSaving.value = true;
  try {
    const payload: Record<string, unknown> = { ...catForm.value };
    if (editingCat.value) {
      if (
        editingCat.value.backendStatus === 'completed' &&
        payload.status !== 'completed'
      ) {
        const confirmed = await new Promise<boolean>((resolve) => {
          $q.dialog({
            title: 'Upozornenie',
            message:
              'Zmena stavu z "Ohodnotená" vymaže existujúce hodnotenia pre túto mačku. Pokračovať?',
            cancel: true,
            persistent: true,
          })
            .onOk(() => resolve(true))
            .onCancel(() => resolve(false));
        });
        if (!confirmed) {
          catSaving.value = false;
          return;
        }
        payload.deleteEvaluations = true;
      }
      await api.put(
        `/competitions/${ctx.competitionId.value}/cats/${editingCat.value.id}`,
        payload,
      );
    } else {
      await api.post(`/competitions/${ctx.competitionId.value}/cats`, payload);
    }
    showCatDialog.value = false;
    await ctx.loadDashboard();
  } catch (err: unknown) {
    const serverMsg =
      axios.isAxiosError(err) && typeof err.response?.data === 'object' && err.response?.data !== null
        ? (err.response.data as { message?: string }).message
        : undefined;
    ctx.notify({
      type: 'negative',
      message:
        typeof serverMsg === 'string' && serverMsg.length > 0 ? serverMsg : 'Chyba pri ukladaní mačky',
    });
  } finally {
    catSaving.value = false;
  }
}

function deleteCat(cat: CatEntry) {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odstrániť mačku',
    message: `Naozaj chcete odstrániť mačku "${cat.name}"? Tým sa vymažú aj jej hodnotenia.`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${ctx.competitionId.value}/cats/${cat.id}`);
        await ctx.loadDashboard();
        ctx.notify({ type: 'positive', message: 'Mačka bola odstránená' });
      } catch {
        ctx.notify({ type: 'negative', message: 'Chyba pri odstraňovaní mačky' });
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
.cats-table :deep(thead th) {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  color: #666;
}
.status-badge {
  font-size: 11px;
  padding: 2px 8px;
}
</style>
