<template>
  <q-page class="flex flex-center column q-pa-lg">
    <q-spinner color="primary" size="48px" />
    <div class="q-mt-md text-body2 text-grey-7">Otváram live monitoring…</div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from 'src/boot/axios';

const route = useRoute();
const router = useRouter();

function pathForRound(competitionId: string, round: string | null | undefined): string {
  const base = `/competition/${competitionId}`;
  if (round === 'ring1' || round === 'ring2') {
    return `${base}/live-monitoring-ring`;
  }
  return `${base}/live-scoring`;
}

onMounted(async () => {
  const id = route.params.competitionId as string;
  if (!id) return;
  try {
    const { data } = await api.get<{ competition: { currentRound: string | null } }>(`/live/${id}/scoring`);
    const round = data.competition?.currentRound;
    await router.replace(pathForRound(id, round));
  } catch {
    await router.replace(`/competition/${id}/live-scoring`);
  }
});
</script>
