<template>
  <div>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="section-title">Vystavovatelia</div>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nový vystavovateľ"
            no-caps
            @click="openExhibitorDialog"
          />
        </div>
        <q-table
          :rows="ctx.exhibitors.value"
          :columns="exhibitorColumns"
          row-key="id"
          flat
          :pagination="{ rowsPerPage: 0 }"
          hide-pagination
          class="cats-table"
        >
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="deleteExhibitor(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showExhibitorDialog">
      <q-card style="min-width: 400px">
        <q-card-section><div class="text-h6">Nový vystavovateľ</div></q-card-section>
        <q-card-section>
          <q-form class="q-gutter-md" @submit="saveExhibitor">
            <q-select
              v-model="exhibitorForm.userId"
              :options="systemUserMenuOptions"
              label="Používateľ (zo správy používateľov)"
              outlined
              dense
              emit-value
              map-options
              use-input
              hide-selected
              fill-input
              input-debounce="0"
              :rules="[(val) => (val != null && val !== '') || 'Vyberte používateľa']"
              @popup-show="syncSystemUserMenu"
              @filter="filterSystemUsers"
            />
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn v-close-popup flat label="Zrušiť" />
              <q-btn type="submit" color="primary" label="Vytvoriť" :loading="exhibitorSaving" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import {
  useAdminCompetition,
  type ExhibitorEntry,
} from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();
const $q = useQuasar();

const exhibitorColumns = [
  { name: 'name', label: 'Meno', field: 'name', align: 'left' as const, sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'phone', label: 'Telefón', field: 'phone', align: 'left' as const },
  { name: 'catsCount', label: 'Mačky', field: 'catsCount', align: 'center' as const },
  { name: 'actions', label: 'Akcie', field: 'id', align: 'center' as const },
];

const showExhibitorDialog = ref(false);
const exhibitorForm = ref({ userId: null as number | null });
const exhibitorSaving = ref(false);

const systemUserMenuOptions = ref<{ label: string; value: number }[]>([]);

function syncSystemUserMenu() {
  systemUserMenuOptions.value = ctx.systemUserSelectOptions.value.slice();
}

function filterSystemUsers(
  val: string,
  doneFn: (callbackFn: () => void, afterFn?: (ref: unknown) => void) => void,
) {
  doneFn(() => {
    const needle = val.toLowerCase();
    const src = ctx.systemUserSelectOptions.value;
    systemUserMenuOptions.value = !needle
      ? src.slice()
      : src.filter((o) => o.label.toLowerCase().includes(needle));
  });
}

function openExhibitorDialog() {
  exhibitorForm.value = { userId: null };
  syncSystemUserMenu();
  showExhibitorDialog.value = true;
}

async function saveExhibitor() {
  if (!ctx.competitionId.value || exhibitorForm.value.userId == null) return;
  exhibitorSaving.value = true;
  try {
    await api.post(`/competitions/${ctx.competitionId.value}/exhibitors`, {
      userId: exhibitorForm.value.userId,
    });
    showExhibitorDialog.value = false;
    await ctx.loadDashboard();
    ctx.notify({ type: 'positive', message: 'Vystavovateľ pridaný' });
  } catch {
    ctx.notify({ type: 'negative', message: 'Chyba pri ukladaní' });
  } finally {
    exhibitorSaving.value = false;
  }
}

function deleteExhibitor(exh: ExhibitorEntry) {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odstrániť vystavovateľa',
    message: `Naozaj chcete odstrániť "${exh.name}"?`,
    cancel: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${ctx.competitionId.value}/exhibitors/${exh.id}`);
        await ctx.loadDashboard();
        ctx.notify({ type: 'positive', message: 'Vystavovateľ odstránený' });
      } catch {
        ctx.notify({
          type: 'negative',
          message: 'Chyba – vystavovateľ má priradené mačky',
        });
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
</style>
