import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';

export interface WcfGrade {
  id: number;
  competitionId: number;
  code: string;
  name: string | null;
  countsAsAccepted: boolean;
  eligibleForNomBis: boolean;
  sortOrder: number;
}

export interface WcfTitle {
  id: number;
  competitionId: number;
  code: string;
  name: string | null;
  description: string | null;
  classCodes: string[];
  sortOrder: number;
}

export interface WcfClass {
  id: number;
  competitionId: number;
  code: string;
  name: string;
  description: string | null;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  isNeuter: boolean;
  isKittenOrJunior: boolean;
  isSeparateBisCategory: boolean;
  sortOrder: number;
}

interface CacheEntry<T> {
  competitionId: number;
  rows: T[];
  loaded: boolean;
}

/** WCF taxonómia (grades / titles / classes) per súťaž s cache na aktuálne competitionId. */
export const useWcfTaxonomyStore = defineStore('wcf_taxonomy', () => {
  const activeCompetitionId = ref<number | null>(null);

  const gradesCache = ref<CacheEntry<WcfGrade>>({ competitionId: 0, rows: [], loaded: false });
  const titlesCache = ref<CacheEntry<WcfTitle>>({ competitionId: 0, rows: [], loaded: false });
  const classesCache = ref<CacheEntry<WcfClass>>({ competitionId: 0, rows: [], loaded: false });

  const loading = ref(false);

  const grades = computed<WcfGrade[]>(() =>
    gradesCache.value.competitionId === activeCompetitionId.value ? gradesCache.value.rows : [],
  );
  const titles = computed<WcfTitle[]>(() =>
    titlesCache.value.competitionId === activeCompetitionId.value ? titlesCache.value.rows : [],
  );
  const classes = computed<WcfClass[]>(() =>
    classesCache.value.competitionId === activeCompetitionId.value ? classesCache.value.rows : [],
  );

  /** Pomocný getter: dostupné kódy gradov pre túto súťaž (zoradené). */
  const gradeCodes = computed(() => grades.value.map((g) => g.code));
  /** Kódy gradov, ktoré počítajú ako prijaté (typicky EX1/EX2/EX3). */
  const acceptedGradeCodes = computed(() =>
    grades.value.filter((g) => g.countsAsAccepted).map((g) => g.code),
  );
  /** Kódy gradov vhodných pre NomBIS (typicky EX1). */
  const nomBisGradeCodes = computed(() =>
    grades.value.filter((g) => g.eligibleForNomBis).map((g) => g.code),
  );

  function setActiveCompetition(id: number | null) {
    if (activeCompetitionId.value !== id) {
      activeCompetitionId.value = id;
      gradesCache.value = { competitionId: 0, rows: [], loaded: false };
      titlesCache.value = { competitionId: 0, rows: [], loaded: false };
      classesCache.value = { competitionId: 0, rows: [], loaded: false };
    }
  }

  async function loadAll(competitionId: number, opts: { force?: boolean } = {}) {
    setActiveCompetition(competitionId);
    if (
      !opts.force &&
      gradesCache.value.loaded &&
      titlesCache.value.loaded &&
      classesCache.value.loaded &&
      gradesCache.value.competitionId === competitionId
    ) {
      return;
    }
    loading.value = true;
    try {
      const [gRes, tRes, cRes] = await Promise.all([
        api.get<WcfGrade[]>(`/competitions/${competitionId}/grades`),
        api.get<WcfTitle[]>(`/competitions/${competitionId}/titles`),
        api.get<WcfClass[]>(`/competitions/${competitionId}/classes`),
      ]);
      gradesCache.value = { competitionId, rows: gRes.data ?? [], loaded: true };
      titlesCache.value = { competitionId, rows: tRes.data ?? [], loaded: true };
      classesCache.value = { competitionId, rows: cRes.data ?? [], loaded: true };
    } finally {
      loading.value = false;
    }
  }

  async function reloadGrades(competitionId: number) {
    const { data } = await api.get<WcfGrade[]>(`/competitions/${competitionId}/grades`);
    gradesCache.value = { competitionId, rows: data ?? [], loaded: true };
  }
  async function reloadTitles(competitionId: number) {
    const { data } = await api.get<WcfTitle[]>(`/competitions/${competitionId}/titles`);
    titlesCache.value = { competitionId, rows: data ?? [], loaded: true };
  }
  async function reloadClasses(competitionId: number) {
    const { data } = await api.get<WcfClass[]>(`/competitions/${competitionId}/classes`);
    classesCache.value = { competitionId, rows: data ?? [], loaded: true };
  }

  /** Tituly dostupné pre mačku podľa jej WCF triedy (permissive ak chýba). */
  function titlesForCat(input: {
    catClass?: string | null;
  }): WcfTitle[] {
    const cat = input ?? {};
    const cls = (cat.catClass ?? '').trim();

    return titles.value.filter((t) => {
      if (t.classCodes.length === 0) return true;
      if (!cls) return true;
      return t.classCodes.includes(cls);
    });
  }

  return {
    activeCompetitionId,
    grades,
    titles,
    classes,
    gradeCodes,
    acceptedGradeCodes,
    nomBisGradeCodes,
    loading,
    setActiveCompetition,
    loadAll,
    reloadGrades,
    reloadTitles,
    reloadClasses,
    titlesForCat,
  };
});
