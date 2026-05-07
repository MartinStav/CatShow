import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';

interface Competition {
  id: number;
  name: string;
  date: string;
  description: string | null;
  location: string | null;
  status: 'active' | 'paused' | 'finished' | 'scheduled';
  published: boolean;
  currentRound: string | null;
  roundsEnabled: string[];
}

export const useCompetitionStore = defineStore('competition', () => {
  const competitions = ref<Competition[]>([]);
  const current = ref<Competition | null>(null);
  const loading = ref(false);

  const activeCompetitions = computed(() =>
    competitions.value.filter((c) => c.status !== 'finished')
  );

  async function fetchAll() {
    loading.value = true;
    try {
      const { data } = await api.get('/competitions');
      competitions.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPublic() {
    loading.value = true;
    try {
      const { data } = await api.get('/competitions/public');
      competitions.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchOne(id: number) {
    const { data } = await api.get(`/competitions/${id}`);
    current.value = data;
    return data;
  }

  function setCurrent(comp: Competition | null) {
    current.value = comp;
  }

  return {
    competitions,
    current,
    loading,
    activeCompetitions,
    fetchAll,
    fetchPublic,
    fetchOne,
    setCurrent,
  };
});
