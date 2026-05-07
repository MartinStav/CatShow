<template>
  <q-page class="q-pa-lg">
    <div class="page-wrapper">
      <div class="text-h5 text-weight-bold q-mb-xs">Vyvolávanie na ring</div>
      <div class="text-body2 text-grey-7 q-mb-md">
        Stav vyvolávania na ring (čaká / volaná / hotovo).
      </div>

      <!-- Summary -->
      <div class="row q-gutter-sm q-mb-lg">
        <q-badge color="grey" text-color="white" class="q-pa-sm">
          Waiting: {{ waitingCount }}
        </q-badge>
        <q-badge color="blue" text-color="white" class="q-pa-sm">
          Called: {{ calledCount }}
        </q-badge>
        <q-badge color="green" text-color="white" class="q-pa-sm">
          Completed: {{ completedCount }}
        </q-badge>
      </div>

      <!-- Waiting List -->
      <div v-if="waitingList.length > 0" class="q-mb-lg">
        <div class="text-h6 text-weight-bold q-mb-md">Waiting</div>
        <div class="row q-col-gutter-sm">
          <div
            v-for="cat in waitingList"
            :key="cat.id"
            class="col-12 col-sm-6 col-md-4 col-lg-2-4"
          >
            <q-card>
              <q-card-section class="q-pa-sm text-center">
                <div class="text-subtitle2 text-weight-bold q-mb-xs">{{ cat.registrationNumber }}</div>
                <div class="text-body2 text-weight-medium q-mb-xs">{{ cat.name }}</div>
                <div class="text-caption text-grey-7 q-mb-xs">{{ cat.breed }}</div>
                <div class="text-caption text-grey-6 q-mb-sm">{{ cat.exhibitor?.name }}</div>
                <q-btn
                  color="primary"
                  label="Call"
                  icon="phone"
                  size="sm"
                  class="full-width"
                  @click="callCat(cat.id)"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Called + Completed List -->
      <div v-if="calledList.length > 0 || completedList.length > 0">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6 text-weight-bold">Called</div>
          <q-btn
            v-if="calledList.length > 0"
            color="green"
            label="Mark all as Done"
            icon="check"
            size="sm"
            @click="markAllAsDone"
          />
        </div>
        
        <!-- Called Cards -->
        <div v-if="calledList.length > 0" class="row q-col-gutter-sm q-mb-md">
          <div
            v-for="cat in calledList"
            :key="cat.id"
            class="col-12 col-sm-6 col-md-4 col-lg-2-4"
          >
            <q-card>
              <q-card-section class="q-pa-sm text-center">
                <div class="text-subtitle2 text-weight-bold q-mb-xs">{{ cat.registrationNumber }}</div>
                <div class="text-body2 text-weight-medium q-mb-xs">{{ cat.name }}</div>
                <div class="text-caption text-grey-7 q-mb-xs">{{ cat.breed }}</div>
                <div class="text-caption text-grey-6 q-mb-sm">{{ cat.exhibitor?.name }}</div>
                <q-btn
                  color="green"
                  label="Done"
                  icon="check"
                  size="sm"
                  class="full-width"
                  @click="completeCat(cat.id)"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Completed Cards -->
        <div v-if="completedList.length > 0" class="row q-col-gutter-sm">
          <div
            v-for="cat in completedList"
            :key="cat.id"
            class="col-12 col-sm-6 col-md-4 col-lg-2-4"
          >
            <q-card class="bg-green-1">
              <q-card-section class="q-pa-sm text-center">
                <div class="text-subtitle2 text-weight-bold q-mb-xs">{{ cat.registrationNumber }}</div>
                <div class="text-body2 text-weight-medium q-mb-xs">{{ cat.name }}</div>
                <div class="text-caption text-grey-7 q-mb-xs">{{ cat.breed }}</div>
                <div class="text-caption text-grey-6 q-mb-sm">{{ cat.exhibitor?.name }}</div>
                <q-btn
                  color="grey"
                  label="Reset"
                  icon="refresh"
                  size="sm"
                  class="full-width"
                  @click="resetCat(cat.id)"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';

interface Cat {
  id: string;
  registrationNumber: string;
  name: string;
  breed: string;
  group: string;
  sex: string;
  age: string;
  exhibitorId: string;
  status: 'waiting' | 'called' | 'judging' | 'completed';
  exhibitor?: { name: string };
}

const route = useRoute();
const competitionId = computed(() => route.params.competitionId as string);

const callingList = ref<Cat[]>([]);
const loading = ref(false);

const loadCats = async () => {
  if (!competitionId.value) return;
  loading.value = true;
  try {
    const { data } = await api.get<Cat[]>(`/competitions/${competitionId.value}/cats`);
    const raw = data ?? [];
    callingList.value = raw.map((c) => ({
      ...c,
      id: String(c.id),
      exhibitorId: c.exhibitorId != null ? String(c.exhibitorId) : '',
    }));
  } catch (err) {
    console.error('Failed to load cats:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(loadCats);

const waitingList = computed(() =>
  callingList.value.filter((c) => c.status === 'waiting')
);

const calledList = computed(() =>
  callingList.value.filter((c) => c.status === 'called')
);

const completedList = computed(() =>
  callingList.value.filter((c) => c.status === 'completed')
);

const waitingCount = computed(() =>
  callingList.value.filter((c) => c.status === 'waiting').length
);
const calledCount = computed(() =>
  callingList.value.filter((c) => c.status === 'called').length
);
const completedCount = computed(() =>
  callingList.value.filter((c) => c.status === 'completed').length
);

const updateCatStatus = async (catId: string, status: 'waiting' | 'called' | 'completed') => {
  if (!competitionId.value) return;
  try {
    await api.put(`/competitions/${competitionId.value}/cats/${catId}`, { status });
    const cat = callingList.value.find((c) => c.id === catId);
    if (cat) cat.status = status;
  } catch (err) {
    console.error('Failed to update cat status:', err);
  }
};

const callCat = (id: string) => {
  const cat = callingList.value.find((c) => c.id === id);
  if (cat && cat.status === 'waiting') {
    void updateCatStatus(id, 'called');
  }
};

const completeCat = (id: string) => {
  const cat = callingList.value.find((c) => c.id === id);
  if (cat && cat.status === 'called') {
    void updateCatStatus(id, 'completed');
  }
};

const resetCat = (id: string) => {
  const cat = callingList.value.find((c) => c.id === id);
  if (cat) {
    void updateCatStatus(id, 'waiting');
  }
};

const markAllAsDone = async () => {
  const called = callingList.value.filter((c) => c.status === 'called');
  for (const cat of called) {
    await updateCatStatus(cat.id, 'completed');
  }
};
</script>

<style scoped>
.page-wrapper {
  max-width: 900px;
  margin: 0 auto;
  background: transparent;
}

.col-lg-2-4 {
  flex: 0 0 20%;
  max-width: 20%;
}

@media (max-width: 1023px) {
  .col-lg-2-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
}

@media (max-width: 599px) {
  .col-lg-2-4 {
    flex: 0 0 50%;
    max-width: 50%;
  }
}
</style>
