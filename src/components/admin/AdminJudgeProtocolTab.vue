<template>
  <div>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="section-title">Protokol</div>
          <div class="row q-gutter-sm items-center">
            <q-select
              v-model="nominationJudgeFilter"
              :options="nominationJudgeFilterOptions"
              dense
              outlined
              emit-value
              map-options
              label="Rozhodca"
              style="min-width: 220px"
              class="filter-select"
            />
            <q-btn
              flat
              color="negative"
              no-caps
              label="Vymazať všetko"
              :disable="ctx.judgingOrders.value.length === 0"
              @click="clearAllNominationOrders"
            />
            <q-btn
              unelevated
              color="primary"
              icon="add"
              no-caps
              label="Pridať záznam"
              :disable="ctx.judgesList.value.length === 0 || ctx.cats.value.length === 0"
              @click="openJudgingOrderDialog(null)"
            />
          </div>
        </div>

        <div
          v-if="ctx.judgesList.value.length === 0 || ctx.cats.value.length === 0"
          class="text-body2 text-grey-7 q-mb-md"
        >
          Najprv pridajte v súťaži <strong>rozhodcov</strong> a <strong>mačky</strong>.
        </div>

        <q-table
          :rows="filteredJudgingOrders"
          :columns="judgingOrderColumns"
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
                icon="edit"
                color="primary"
                @click="openJudgingOrderDialog(props.row)"
              />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="deleteJudgingOrder(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showJudgingOrderDialog" persistent>
      <q-card style="min-width: 420px; max-width: 96vw">
        <q-card-section>
          <div class="text-h6">
            {{ editingJudgingOrderId ? 'Upraviť záznam protokolu' : 'Nový záznam do judge protokolu' }}
          </div>
        </q-card-section>
        <q-card-section>
          <q-form class="q-gutter-md" @submit.prevent="saveJudgingOrder">
            <q-select
              v-model="judgingOrderForm.judgeId"
              :options="ctx.judgesList.value.map((j) => ({ label: j.name, value: j.id }))"
              label="Rozhodca"
              outlined
              dense
              emit-value
              map-options
              :rules="[(v) => v != null || 'Vyberte rozhodcu']"
            />
            <q-select
              v-model="judgingOrderForm.catId"
              :options="nominationCatSelectOptions"
              label="Mačka"
              outlined
              dense
              emit-value
              map-options
              :rules="[(v) => v != null || 'Vyberte mačku']"
            />
            <q-input
              v-model.number="judgingOrderForm.orderPosition"
              label="Poradie"
              type="number"
              outlined
              dense
              hint="0 = prvá v rámci stola/rozhodcu podľa zoradenia"
            />
            <q-input
              v-model.number="judgingOrderForm.tableNumber"
              label="Číslo stola"
              type="number"
              outlined
              dense
              :min="1"
            />
            <q-input
              v-model="judgingOrderForm.protocolGroup"
              label="Skupina protokolu"
              outlined
              dense
              hint="Rovnaký stôl + rovnaký text = jeden blok; prázdne = predvolený blok."
            />
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn flat label="Zrušiť" @click="closeJudgingOrderDialog" />
              <q-btn
                type="submit"
                color="primary"
                label="Uložiť"
                :loading="judgingOrderSaving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { compareJudgingOrders } from 'src/utils/cat_steward_cycle';
import {
  useAdminCompetition,
  type JudgingOrderRow,
} from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();
const $q = useQuasar();

const nominationJudgeFilter = ref<'all' | number>('all');
const showJudgingOrderDialog = ref(false);
const editingJudgingOrderId = ref<number | null>(null);
const judgingOrderForm = ref({
  judgeId: null as number | null,
  catId: null as number | null,
  orderPosition: 0,
  tableNumber: 1,
  protocolGroup: '' as string,
});
const judgingOrderSaving = ref(false);

const nominationJudgeFilterOptions = computed(() => [
  { label: 'Všetci rozhodcovia', value: 'all' as const },
  ...ctx.judgesList.value.map((j) => ({ label: j.name, value: j.id })),
]);

const nominationCatSelectOptions = computed(() =>
  ctx.cats.value.map((c) => ({
    label: `${c.number} — ${c.name}${c.catClass ? ` (${c.catClass})` : ''}`,
    value: c.id,
  })),
);

const filteredJudgingOrders = computed(() => {
  const base =
    nominationJudgeFilter.value === 'all'
      ? ctx.judgingOrders.value
      : ctx.judgingOrders.value.filter((r) => r.judgeId === nominationJudgeFilter.value);
  return [...base].sort(compareJudgingOrders);
});

const judgingOrderColumns = [
  {
    name: 'tableNumber',
    label: 'Stôl',
    field: 'tableNumber',
    align: 'center' as const,
    sortable: true,
  },
  {
    name: 'protocolGroup',
    label: 'Skupina',
    field: (r: JudgingOrderRow) => r.protocolGroup ?? '—',
    align: 'left' as const,
    sortable: true,
  },
  {
    name: 'orderPosition',
    label: 'Poradie',
    field: 'orderPosition',
    align: 'center' as const,
    sortable: true,
  },
  {
    name: 'judgeName',
    label: 'Rozhodca',
    field: 'judgeName',
    align: 'left' as const,
    sortable: true,
  },
  {
    name: 'catNumber',
    label: 'Č. mačky',
    field: 'catNumber',
    align: 'left' as const,
    sortable: true,
  },
  { name: 'catName', label: 'Meno', field: 'catName', align: 'left' as const, sortable: true },
  { name: 'catGroup', label: 'Skupina', field: 'catGroup', align: 'left' as const, sortable: true },
  { name: 'actions', label: 'Akcie', field: 'id', align: 'center' as const },
];

function openJudgingOrderDialog(row: JudgingOrderRow | null) {
  editingJudgingOrderId.value = row?.id ?? null;
  if (row) {
    judgingOrderForm.value = {
      judgeId: row.judgeId,
      catId: row.catId,
      orderPosition: row.orderPosition,
      tableNumber: row.tableNumber,
      protocolGroup: row.protocolGroup ?? '',
    };
  } else {
    const firstJudge = ctx.judgesList.value[0];
    judgingOrderForm.value = {
      judgeId: firstJudge?.id ?? null,
      catId: null,
      orderPosition: 0,
      tableNumber: 1,
      protocolGroup: '',
    };
  }
  showJudgingOrderDialog.value = true;
}

function closeJudgingOrderDialog() {
  showJudgingOrderDialog.value = false;
  editingJudgingOrderId.value = null;
}

async function saveJudgingOrder() {
  if (!ctx.competitionId.value) return;
  const f = judgingOrderForm.value;
  if (f.judgeId == null || f.catId == null) return;
  judgingOrderSaving.value = true;
  try {
    const pg = typeof f.protocolGroup === 'string' ? f.protocolGroup.trim().slice(0, 120) : '';
    const payload = {
      judgeId: f.judgeId,
      catId: f.catId,
      orderPosition: f.orderPosition,
      tableNumber: f.tableNumber,
      protocolGroup: pg.length > 0 ? pg : null,
    };
    if (editingJudgingOrderId.value != null) {
      await api.put(
        `/competitions/${ctx.competitionId.value}/judging-orders/${editingJudgingOrderId.value}`,
        payload,
      );
    } else {
      await api.post(`/competitions/${ctx.competitionId.value}/judging-orders`, payload);
    }
    closeJudgingOrderDialog();
    await ctx.loadJudgingOrders();
    ctx.notify({ type: 'positive', message: 'Judge protokol uložený' });
  } catch (err: unknown) {
    ctx.notify({ type: 'negative', message: ctx.serverErrorMessage(err) });
  } finally {
    judgingOrderSaving.value = false;
  }
}

function deleteJudgingOrder(row: JudgingOrderRow) {
  if (!ctx.competitionId.value) return;
  $q.dialog({
    title: 'Odstrániť záznam',
    message: `Odstrániť priradenie ${row.catNumber} — ${row.catName}?`,
    cancel: true,
  }).onOk(() => {
    void (async () => {
      try {
        await api.delete(`/competitions/${ctx.competitionId.value}/judging-orders/${row.id}`);
        await ctx.loadJudgingOrders();
        ctx.notify({ type: 'positive', message: 'Záznam odstránený' });
      } catch (err: unknown) {
        ctx.notify({ type: 'negative', message: ctx.serverErrorMessage(err) });
      }
    })();
  });
}

function clearAllNominationOrders() {
  const cid = ctx.competitionId.value;
  if (!cid || ctx.judgingOrders.value.length === 0) return;
  $q.dialog({
    title: 'Vymazať celé poradie',
    message:
      'Naozaj chcete vymazať celý judge protokol? Rozhodcovia budú v nominácii znova vidieť všetky mačky, kým nevytvoríte protokol znova.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await Promise.all(
          ctx.judgingOrders.value.map((o) =>
            api.delete(`/competitions/${cid}/judging-orders/${o.id}`),
          ),
        );
        await ctx.loadJudgingOrders();
        ctx.notify({ type: 'positive', message: 'Judge protokol vymazaný' });
      } catch {
        ctx.notify({ type: 'negative', message: 'Chyba pri mazaní' });
      }
    })();
  });
}

onMounted(() => {
  if (ctx.competitionId.value) {
    void ctx.loadJudgingOrders();
  }
});
</script>

<style scoped>
.section-title {
  font-weight: 600;
  font-size: 14px;
}
.filter-select {
  font-size: 12px;
}
.cats-table :deep(thead th) {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  color: #666;
}
</style>
