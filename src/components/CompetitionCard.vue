<template>
  <q-card
    class="cursor-pointer competition-card full-height"
    @click="$emit('navigate', competition.id)"
  >
    <q-card-section class="q-pa-lg">
      <div class="row items-start justify-between q-mb-sm">
        <div class="col">
          <div class="text-h6 text-weight-bold q-mb-xs">{{ competition.name }}</div>
          <div
            v-if="competition.description"
            class="text-body2 text-grey-8 q-mb-md competition-description"
          >
            {{ competition.description }}
          </div>
          <div class="row items-center q-gutter-sm">
            <q-icon name="calendar_today" size="18px" color="grey-7" />
            <div class="text-body2 text-grey-7">{{ formattedDate }}</div>
          </div>
          <div v-if="competition.location" class="row items-center q-gutter-sm q-mt-xs">
            <q-icon name="place" size="18px" color="grey-7" />
            <div class="text-body2 text-grey-7">{{ competition.location }}</div>
          </div>
        </div>
        <q-badge
          :color="badgeColor || statusColor"
          text-color="white"
          class="q-pa-sm"
          style="border-radius: 4px"
        >
          {{ badgeLabel || statusLabel }}
        </q-badge>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Competition {
  id: number;
  name: string;
  date: string;
  description?: string | null;
  location?: string | null;
  status: string;
  published: boolean;
}

const props = defineProps<{
  competition: Competition;
  badgeColor?: string;
  badgeLabel?: string;
}>();

defineEmits<{
  navigate: [id: number];
}>();

const formattedDate = computed(() => {
  try {
    const d = new Date(props.competition.date);
    if (isNaN(d.getTime())) return props.competition.date;
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return props.competition.date;
  }
});

const statusColor = computed(() => {
  switch (props.competition.status) {
    case 'active':
      return 'green';
    case 'paused':
      return 'orange';
    case 'scheduled':
      return 'light-blue-7';
    case 'finished':
      return 'grey';
    default:
      return 'primary';
  }
});

const statusLabel = computed(() => {
  switch (props.competition.status) {
    case 'active':
      return 'Aktívna';
    case 'paused':
      return 'Pozastavená';
    case 'scheduled':
      return 'Ešte nezačala';
    case 'finished':
      return 'Ukončená';
    default:
      return props.competition.status;
  }
});
</script>

<style scoped>
.competition-description {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
