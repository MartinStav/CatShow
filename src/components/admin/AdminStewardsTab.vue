<template>
  <div>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="section-title">Stevardi</div>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Pridať stevarda"
            no-caps
            @click="openStewardRoleDialog"
          />
        </div>
        <q-table
          :rows="stewardRoleRows"
          :columns="stewardRoleColumns"
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
                @click="deleteStewardRole(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showStewardRoleDialog">
      <q-card style="min-width: 400px">
        <q-card-section><div class="text-h6">Pridať stevarda</div></q-card-section>
        <q-card-section>
          <q-form class="q-gutter-md" @submit="saveStewardRole">
            <q-select
              v-model="stewardRoleForm.userId"
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
              <q-btn type="submit" color="primary" label="Pridať" :loading="stewardRoleSaving" />
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
import {
  useAdminCompetition,
  type CompetitionRoleRow,
} from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();
const $q = useQuasar();

const stewardRoleRows = computed(() =>
  ctx.competitionRolesList.value.filter((r) => r.role === 'steward'),
);

const stewardRoleColumns = [
  {
    name: 'name',
    label: 'Meno',
    field: (row: CompetitionRoleRow) => row.user.fullName,
    align: 'left' as const,
    sortable: true,
  },
  {
    name: 'email',
    label: 'E-mail',
    field: (row: CompetitionRoleRow) => row.user.email ?? '—',
    align: 'left' as const,
  },
  { name: 'actions', label: 'Akcie', field: 'id', align: 'center' as const },
];

const showStewardRoleDialog = ref(false);
const stewardRoleForm = ref({ userId: null as number | null });
const stewardRoleSaving = ref(false);

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

function openStewardRoleDialog() {
  stewardRoleForm.value = { userId: null };
  syncSystemUserMenu();
  showStewardRoleDialog.value = true;
}

async function saveStewardRole() {
  if (!ctx.competitionId.value || stewardRoleForm.value.userId == null) return;
  stewardRoleSaving.value = true;
  try {
    await api.post(`/competitions/${ctx.competitionId.value}/roles`, {
      userId: stewardRoleForm.value.userId,
      role: 'steward',
    });
    showStewardRoleDialog.value = false;
    await ctx.loadDashboard();
    ctx.notify({ type: 'positive', message: 'Stevard bol pridaný' });
  } catch (err: unknown) {
    const msg =
      axios.isAxiosError(err) && err.response?.status === 409
        ? 'Tento používateľ už má v súťaži rolu stevarda.'
        : 'Chyba pri ukladaní';
    ctx.notify({ type: 'negative', message: msg });
  } finally {
    stewardRoleSaving.value = false;
  }
}

function deleteStewardRole(row: CompetitionRoleRow) {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odobrať rolu stevarda',
    message: `Odobrať súťažnú rolu stevarda používateľovi „${row.user.fullName}“?`,
    cancel: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${ctx.competitionId.value}/roles/${row.id}`);
        await ctx.loadDashboard();
        ctx.notify({ type: 'positive', message: 'Rola odstránená' });
      } catch {
        ctx.notify({ type: 'negative', message: 'Chyba pri odstraňovaní' });
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
