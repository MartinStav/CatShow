<template>
  <div>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="section-title">Rozhodcovia</div>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nový rozhodca"
            no-caps
            @click="openJudgeDialog"
          />
        </div>
        <q-table
          :rows="ctx.judgesList.value"
          :columns="judgeColumns"
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
                icon="support_agent"
                color="primary"
                @click="openJudgeStewardDialog(props.row)"
              />
              <q-btn
                v-if="
                  (ctx.competition.value.currentRound === 'nomination' ||
                    ctx.competition.value.currentRound === 'ring1') &&
                  props.row.nominationConfirmed
                "
                flat
                round
                dense
                icon="lock_open"
                color="orange"
                @click="unlockJudgeNomination(props.row)"
              />
              <q-btn
                v-if="
                  ctx.competition.value.currentRound === 'ring1' &&
                  props.row.ring1RankingConfirmed
                "
                flat
                round
                dense
                icon="lock_open"
                color="orange"
                @click="unlockJudgeRing1(props.row)"
              />
              <q-btn
                v-if="
                  ctx.competition.value.currentRound === 'ring2' &&
                  props.row.ring2RankingConfirmed
                "
                flat
                round
                dense
                icon="lock_open"
                color="orange"
                @click="unlockJudgeRing2(props.row)"
              />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="deleteJudge(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showJudgeStewardDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Stevard pre rozhodcu</div>
          <div v-if="judgeStewardJudge" class="text-body2 text-grey-7 q-mt-xs">
            {{ judgeStewardJudge.name }}
          </div>
        </q-card-section>
        <q-card-section>
          <q-form class="q-gutter-md" @submit="saveJudgeSteward">
            <q-select
              v-model="judgeStewardForm.stewardUserId"
              :options="editJudgeStewardMenuOptions"
              label="Stevard (len súťažní stevardi)"
              outlined
              dense
              clearable
              emit-value
              map-options
              use-input
              hide-selected
              fill-input
              input-debounce="0"
              @popup-show="onEditJudgeStewardPopupShow"
              @filter="filterEditJudgeStewardUsers"
            />
            <div
              v-if="stewardRoleSelectOptions.length === 0"
              class="text-caption text-grey-7"
            >
              Zatiaľ nie je v súťaži žiadny stevard — najprv ho pridajte na záložke „Stevardi“.
            </div>
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn v-close-popup flat label="Zrušiť" />
              <q-btn type="submit" color="primary" label="Uložiť" :loading="judgeStewardSaving" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showJudgeDialog">
      <q-card style="min-width: 400px">
        <q-card-section><div class="text-h6">Nový rozhodca</div></q-card-section>
        <q-card-section>
          <q-form class="q-gutter-md" @submit="saveJudge">
            <q-select
              v-model="judgeForm.userId"
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
            <q-select
              v-model="judgeForm.stewardUserId"
              :options="stewardUserMenuOptions"
              label="Stevard (voliteľné)"
              outlined
              dense
              clearable
              emit-value
              map-options
              use-input
              hide-selected
              fill-input
              input-debounce="0"
              @popup-show="syncStewardUserMenu"
              @filter="filterStewardUsers"
            />
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn v-close-popup flat label="Zrušiť" />
              <q-btn type="submit" color="primary" label="Vytvoriť" :loading="judgeSaving" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import {
  useAdminCompetition,
  type JudgeEntry,
} from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();
const $q = useQuasar();

const judgeColumns = [
  { name: 'name', label: 'Meno', field: 'name', align: 'left' as const, sortable: true },
  {
    name: 'steward',
    label: 'Stevard',
    field: (row: JudgeEntry) => row.stewardUser?.fullName ?? '—',
    align: 'left' as const,
  },
  { name: 'actions', label: 'Akcie', field: 'id', align: 'center' as const },
];

const showJudgeDialog = ref(false);
const judgeForm = ref({
  userId: null as number | null,
  stewardUserId: null as number | null,
});
const judgeSaving = ref(false);

const showJudgeStewardDialog = ref(false);
const judgeStewardJudge = ref<JudgeEntry | null>(null);
const judgeStewardForm = ref({ stewardUserId: null as number | null });
const judgeStewardSaving = ref(false);

const systemUserMenuOptions = ref<{ label: string; value: number }[]>([]);
const stewardUserMenuOptions = ref<{ label: string; value: number }[]>([]);

function syncSystemUserMenu() {
  systemUserMenuOptions.value = ctx.systemUserSelectOptions.value.slice();
}
function syncStewardUserMenu() {
  stewardUserMenuOptions.value = ctx.systemUserSelectOptions.value.slice();
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
function filterStewardUsers(
  val: string,
  doneFn: (callbackFn: () => void, afterFn?: (ref: unknown) => void) => void,
) {
  doneFn(() => {
    const needle = val.toLowerCase();
    const src = ctx.systemUserSelectOptions.value;
    stewardUserMenuOptions.value = !needle
      ? src.slice()
      : src.filter((o) => o.label.toLowerCase().includes(needle));
  });
}

const stewardRoleSelectOptions = computed(() =>
  ctx.competitionRolesList.value
    .filter((r) => r.role === 'steward')
    .map((r) => ({
      label: `${r.user.fullName} (${r.user.email ?? r.user.phone ?? '—'})`,
      value: r.userId,
    })),
);

const editJudgeStewardSource = ref<{ label: string; value: number }[]>([]);
const editJudgeStewardMenuOptions = ref<{ label: string; value: number }[]>([]);

function syncEditJudgeStewardMenu(row: JudgeEntry) {
  const opts = stewardRoleSelectOptions.value.slice();
  const ids = new Set(opts.map((o) => o.value));
  if (
    row.stewardUserId != null &&
    row.stewardUser != null &&
    !ids.has(row.stewardUserId)
  ) {
    opts.unshift({
      label: `${row.stewardUser.fullName} (${row.stewardUser.email ?? '—'})`,
      value: row.stewardUserId,
    });
  }
  editJudgeStewardSource.value = opts;
  editJudgeStewardMenuOptions.value = opts.slice();
}

function onEditJudgeStewardPopupShow() {
  if (judgeStewardJudge.value) {
    syncEditJudgeStewardMenu(judgeStewardJudge.value);
  }
}

function filterEditJudgeStewardUsers(
  val: string,
  doneFn: (callbackFn: () => void, afterFn?: (ref: unknown) => void) => void,
) {
  doneFn(() => {
    const needle = val.toLowerCase();
    const src = editJudgeStewardSource.value;
    editJudgeStewardMenuOptions.value = !needle
      ? src.slice()
      : src.filter((o) => o.label.toLowerCase().includes(needle));
  });
}

function openJudgeDialog() {
  judgeForm.value = { userId: null, stewardUserId: null };
  syncSystemUserMenu();
  syncStewardUserMenu();
  showJudgeDialog.value = true;
}

function openJudgeStewardDialog(row: JudgeEntry) {
  judgeStewardJudge.value = row;
  judgeStewardForm.value = { stewardUserId: row.stewardUserId ?? null };
  syncEditJudgeStewardMenu(row);
  showJudgeStewardDialog.value = true;
}

async function saveJudge() {
  if (!ctx.competitionId.value || judgeForm.value.userId == null) return;
  judgeSaving.value = true;
  try {
    await api.post(`/competitions/${ctx.competitionId.value}/judges`, {
      userId: judgeForm.value.userId,
      stewardUserId: judgeForm.value.stewardUserId,
    });
    showJudgeDialog.value = false;
    await ctx.loadJudges();
    await ctx.loadDashboard();
    ctx.notify({ type: 'positive', message: 'Rozhodca pridaný' });
  } catch {
    ctx.notify({ type: 'negative', message: 'Chyba pri ukladaní' });
  } finally {
    judgeSaving.value = false;
  }
}

async function saveJudgeSteward() {
  const j = judgeStewardJudge.value;
  if (!ctx.competitionId.value || !j) return;
  judgeStewardSaving.value = true;
  try {
    await api.patch(`/competitions/${ctx.competitionId.value}/judges/${j.id}/steward`, {
      stewardUserId: judgeStewardForm.value.stewardUserId,
    });
    showJudgeStewardDialog.value = false;
    judgeStewardJudge.value = null;
    await ctx.loadJudges();
    await ctx.loadDashboard();
    ctx.notify({ type: 'positive', message: 'Priradenie stevarda bolo uložené' });
  } catch (err: unknown) {
    ctx.notify({ type: 'negative', message: ctx.serverErrorMessage(err) });
  } finally {
    judgeStewardSaving.value = false;
  }
}

function deleteJudge(j: JudgeEntry) {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odstrániť rozhodcu',
    message: `Naozaj chcete odstrániť "${j.name}"?`,
    cancel: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${ctx.competitionId.value}/judges/${j.id}`);
        await ctx.loadJudges();
        await ctx.loadDashboard();
      } catch {
        ctx.notify({ type: 'negative', message: 'Chyba pri odstraňovaní' });
      }
    })();
  });
}

function unlockJudgeNomination(j: JudgeEntry) {
  if (!ctx.competitionId.value) return;
  const inRing1 = ctx.competition.value.currentRound === 'ring1';
  $q.dialog({
    title: 'Odomknúť rozhodcu',
    message: inRing1
      ? `Vrátiť rozhodcu "${j.name}" späť (odomknúť odovzdanie z nominácie pre Ring 1)?`
      : `Odomknúť odovzdanie nominácie pre rozhodcu "${j.name}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.patch(
          `/competitions/${ctx.competitionId.value}/judges/${j.id}/unlock-nomination`,
        );
        await ctx.loadJudges();
        ctx.notify({ type: 'positive', message: 'Rozhodca bol odomknutý' });
      } catch (err: unknown) {
        ctx.notify({ type: 'negative', message: ctx.serverErrorMessage(err) });
      }
    })();
  });
}

function unlockJudgeRing1(j: JudgeEntry) {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odomknúť rozhodcu',
    message: `Odomknúť odovzdanie Ring 1 pre rozhodcu "${j.name}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.patch(`/competitions/${ctx.competitionId.value}/judges/${j.id}/unlock-ring1`);
        await ctx.loadJudges();
        ctx.notify({ type: 'positive', message: 'Rozhodca bol odomknutý' });
      } catch (err: unknown) {
        ctx.notify({ type: 'negative', message: ctx.serverErrorMessage(err) });
      }
    })();
  });
}

function unlockJudgeRing2(j: JudgeEntry) {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odomknúť rozhodcu',
    message: `Odomknúť odovzdanie poradia v Ring 2 pre rozhodcu "${j.name}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.patch(`/competitions/${ctx.competitionId.value}/judges/${j.id}/unlock-ring2`);
        await ctx.loadJudges();
        ctx.notify({ type: 'positive', message: 'Rozhodca bol odomknutý' });
      } catch (err: unknown) {
        ctx.notify({ type: 'negative', message: ctx.serverErrorMessage(err) });
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
