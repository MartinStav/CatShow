import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import axios from 'axios';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';

export type CompetitionRunStatus = 'scheduled' | 'active' | 'paused' | 'finished';

export interface CompetitionMeta {
  name: string;
  date: string;
  description: string;
  location: string;
  status: CompetitionRunStatus;
  published: boolean;
  currentRound: string | null;
  roundsEnabled: string[];
}

export interface CatEntry {
  id: number;
  number: string;
  name: string;
  breed: string;
  group: string;
  groups: string[];
  catClass: string | null;
  exhibitor: string;
  exhibitorId: number | null;
  status: string;
  backendStatus: string;
}

export interface GroupSummary {
  name: string;
  progress: number;
  total: number;
  rated: number;
  currentCat: string | null;
}

export interface ExhibitorEntry {
  id: number;
  name: string;
  email: string;
  phone: string;
  userId: number | null;
  catsCount: number;
}

export interface JudgeEntry {
  id: number;
  name: string;
  userId: number | null;
  stewardUserId: number | null;
  nominationConfirmed?: boolean;
  ring1RankingConfirmed?: boolean;
  ring2RankingConfirmed?: boolean;
  stewardUser?: { id: number; fullName: string; email: string } | null;
}

export interface JudgingOrderRow {
  id: number;
  judgeId: number;
  judgeName: string;
  catId: number;
  catNumber: string;
  catName: string;
  catGroup: string;
  orderPosition: number;
  tableNumber: number;
  protocolGroup: string | null;
}

export interface CompetitionRoleRow {
  id: number;
  userId: number;
  role: string;
  user: { id: number; fullName: string; email: string | null; phone: string | null };
}

export interface SystemUserRow {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
}

export interface AdminSettingsState {
  status: string;
  published: boolean;
  currentRound: string | null;
  roundsEnabled: string[];
}

export interface AdminCompetitionMeta {
  name: string;
  date: string;
  description: string;
  location: string;
}

export interface AdminCompetitionContext {
  competitionId: Ref<number | null>;
  loading: Ref<boolean>;

  competition: Ref<CompetitionMeta>;
  cats: Ref<CatEntry[]>;
  judges: Ref<{ id: number; name: string }[]>;
  judgesList: Ref<JudgeEntry[]>;
  groups: Ref<GroupSummary[]>;
  groupOptions: Ref<string[]>;
  evaluations: Ref<Array<Record<string, unknown>>>;
  exhibitors: Ref<ExhibitorEntry[]>;
  exhibitorOptions: Ref<{ label: string; value: number }[]>;
  judgingOrders: Ref<JudgingOrderRow[]>;
  competitionRolesList: Ref<CompetitionRoleRow[]>;
  systemUsers: Ref<SystemUserRow[]>;

  overallProgress: Ref<number>;
  bisFinalists: Ref<number>;

  settings: Ref<AdminSettingsState>;
  settingsMeta: Ref<AdminCompetitionMeta>;

  ratedCatsCount: ComputedRef<number>;
  systemUserSelectOptions: ComputedRef<{ label: string; value: number }[]>;

  loadDashboard(): Promise<void>;
  loadJudges(): Promise<void>;
  loadJudgingOrders(): Promise<void>;
  loadSystemUsers(): Promise<void>;

  saveCompetitionMeta(): Promise<void>;
  pushSettingsToServer(state: AdminSettingsState): Promise<void>;

  notify(opts: { type: 'positive' | 'negative' | 'warning' | 'info'; message: string }): void;
  serverErrorMessage(err: unknown, fallback?: string): string;
}

export const ADMIN_CTX_KEY: InjectionKey<AdminCompetitionContext> = Symbol('admin-competition-ctx');

const STATUS_DISPLAY_MAP: Record<string, string> = {
  waiting: 'Čaká',
  called: 'Volaná',
  judging: 'Hodnotí sa',
  completed: 'Ohodnotená',
};

function mapCatStatus(backendStatus: string): string {
  return STATUS_DISPLAY_MAP[backendStatus] ?? backendStatus;
}

export function createAdminCompetitionContext(): AdminCompetitionContext {
  const $q = useQuasar();

  const competitionId = ref<number | null>(null);
  const loading = ref(true);

  const competition = ref<CompetitionMeta>({
    name: '',
    date: '',
    description: '',
    location: '',
    status: 'active',
    published: false,
    currentRound: null,
    roundsEnabled: [],
  });

  const cats = ref<CatEntry[]>([]);
  const judges = ref<{ id: number; name: string }[]>([]);
  const judgesList = ref<JudgeEntry[]>([]);
  const groups = ref<GroupSummary[]>([]);
  const groupOptions = ref<string[]>([]);
  const evaluations = ref<Array<Record<string, unknown>>>([]);
  const exhibitors = ref<ExhibitorEntry[]>([]);
  const exhibitorOptions = ref<{ label: string; value: number }[]>([]);
  const judgingOrders = ref<JudgingOrderRow[]>([]);
  const competitionRolesList = ref<CompetitionRoleRow[]>([]);
  const systemUsers = ref<SystemUserRow[]>([]);

  const overallProgress = ref(0);
  const bisFinalists = ref(0);

  const settings = ref<AdminSettingsState>({
    status: 'active',
    published: false,
    currentRound: null,
    roundsEnabled: [],
  });
  const settingsMeta = ref<AdminCompetitionMeta>({
    name: '',
    date: '',
    description: '',
    location: '',
  });

  const ratedCatsCount = computed(() => {
    const evalCatIds = new Set(evaluations.value.map((e) => e.catId));
    return cats.value.filter((c) => evalCatIds.has(c.id)).length;
  });

  const systemUserSelectOptions = computed(() =>
    systemUsers.value.map((u) => ({
      label: [u.fullName, u.email || u.phone || '', u.role === 'demo' ? 'Demo' : '']
        .filter(Boolean)
        .join(' · '),
      value: u.id,
    })),
  );

  function notify(opts: { type: 'positive' | 'negative' | 'warning' | 'info'; message: string }) {
    $q.notify({ ...opts, position: 'top' });
  }

  function serverErrorMessage(err: unknown, fallback = 'Chyba pri ukladaní'): string {
    if (axios.isAxiosError(err)) {
      const msg = (err.response?.data as { message?: string } | undefined)?.message;
      if (typeof msg === 'string' && msg.length > 0) return msg;
    }
    return fallback;
  }

  async function loadJudgingOrders(): Promise<void> {
    if (!competitionId.value) return;
    const { data } = await api.get<
      Array<{
        id: number;
        judgeId: number;
        catId: number;
        orderPosition: number;
        tableNumber: number;
        protocolGroup?: string | null;
        judge?: { name: string };
        cat?: { registrationNumber: string; name: string; group: string };
      }>
    >(`/competitions/${competitionId.value}/judging-orders`);
    judgingOrders.value = data.map((o) => ({
      id: o.id,
      judgeId: o.judgeId,
      judgeName: o.judge?.name ?? `#${o.judgeId}`,
      catId: o.catId,
      catNumber: o.cat?.registrationNumber ?? String(o.catId),
      catName: o.cat?.name ?? '',
      catGroup: o.cat?.group ?? '',
      orderPosition: o.orderPosition,
      tableNumber: o.tableNumber,
      protocolGroup:
        typeof o.protocolGroup === 'string' && o.protocolGroup.trim().length > 0
          ? o.protocolGroup.trim()
          : null,
    }));
  }

  async function loadJudges(): Promise<void> {
    if (!competitionId.value) return;
    try {
      const { data } = await api.get<JudgeEntry[]>(`/competitions/${competitionId.value}/judges`);
      judgesList.value = data;
    } catch (err: unknown) {
      judgesList.value = [];
      notify({
        type: 'negative',
        message: serverErrorMessage(
          err,
          'Nepodarilo sa načítať rozhodcov. Skontrolujte backend log alebo spustite migrácie databázy.',
        ),
      });
    }
  }

  async function loadSystemUsers(): Promise<void> {
    try {
      const { data } = await api.get<SystemUserRow[]>('/users');
      systemUsers.value = data;
    } catch {
      systemUsers.value = [];
    }
  }

  const settingsWatchSync: { lock: boolean } = { lock: false };

  async function loadDashboard(): Promise<void> {
    if (!competitionId.value) return;
    try {
      const { data } = await api.get(`/competitions/${competitionId.value}/dashboard`);

      competition.value = {
        name: data.competition.name,
        date: data.competition.date,
        description: data.competition.description || '',
        location: data.competition.location || '',
        status: data.competition.status,
        published: data.competition.published,
        currentRound: data.competition.currentRound,
        roundsEnabled: data.competition.roundsEnabled || [],
      };

      overallProgress.value = data.summary.overallProgress;
      bisFinalists.value = data.summary.bisFinalists;
      judges.value = data.judges;
      groups.value = data.groups;
      groupOptions.value = data.groups.map((g: { name: string }) => g.name);

      settingsWatchSync.lock = true;
      settings.value = {
        status: data.competition.status,
        published: data.competition.published,
        currentRound: data.competition.currentRound || null,
        roundsEnabled: data.competition.roundsEnabled || [],
      };
      settingsMeta.value = {
        name: data.competition.name,
        date: data.competition.date,
        description: data.competition.description || '',
        location: data.competition.location || '',
      };
      setTimeout(() => {
        settingsWatchSync.lock = false;
      }, 100);

      const { data: catsData } = await api.get(`/competitions/${competitionId.value}/cats`);
      cats.value = catsData.map((c: Record<string, unknown>) => {
        const catGroups =
          Array.isArray(c.groups) && c.groups.length > 0
            ? (c.groups as string[])
            : typeof c.group === 'string' && c.group.length > 0
              ? [c.group]
              : [];
        return {
          id: c.id as number,
          number: c.registrationNumber as string,
          name: c.name as string,
          breed: c.breed as string,
          group: catGroups.join(', '),
          groups: catGroups,
          catClass: typeof c.class === 'string' && c.class.length > 0 ? c.class : null,
          exhibitor: (c.exhibitor as { name: string })?.name || '-',
          exhibitorId: c.exhibitorId as number | null,
          status: mapCatStatus(c.status as string),
          backendStatus: c.status as string,
        };
      });

      try {
        const { data: evalsData } = await api.get(
          `/competitions/${competitionId.value}/evaluations`,
        );
        evaluations.value = evalsData;
      } catch {
        evaluations.value = [];
      }

      try {
        const { data: rolesData } = await api.get<CompetitionRoleRow[]>(
          `/competitions/${competitionId.value}/roles`,
        );
        competitionRolesList.value = rolesData;
      } catch {
        competitionRolesList.value = [];
      }

      try {
        const { data: exhData } = await api.get(`/competitions/${competitionId.value}/exhibitors`);
        exhibitors.value = exhData.map((e: Record<string, unknown>) => ({
          id: e.id as number,
          name: e.name as string,
          email: (e.email as string) || '',
          phone: (e.phone as string) || '',
          userId: e.userId as number | null,
          catsCount: Array.isArray(e.cats) ? (e.cats as unknown[]).length : 0,
        }));
        exhibitorOptions.value = exhibitors.value.map((e) => ({ label: e.name, value: e.id }));
      } catch {
        exhibitors.value = [];
        exhibitorOptions.value = [];
      }

      try {
        await loadJudgingOrders();
      } catch {
        judgingOrders.value = [];
      }

      loading.value = false;
    } catch {
      loading.value = false;
    }
  }

  async function pushSettingsToServer(state: AdminSettingsState): Promise<void> {
    if (!competitionId.value || settingsWatchSync.lock) return;
    try {
      const normalizedStatus = state.status;
      let normalizedCurrentRound = state.currentRound || null;
      if (normalizedStatus !== 'active') {
        normalizedCurrentRound = null;
      } else if (!normalizedCurrentRound) {
        const firstEnabledRound =
          (state.roundsEnabled || []).find((r) =>
            ['nomination', 'ring1', 'ring2'].includes(r),
          ) || 'nomination';
        normalizedCurrentRound = firstEnabledRound;
      }

      await api.put(`/competitions/${competitionId.value}`, {
        status: normalizedStatus,
        published: state.published,
        currentRound: normalizedCurrentRound,
        roundsEnabled: state.roundsEnabled,
      });

      if (
        state.status !== normalizedStatus ||
        (state.currentRound || null) !== normalizedCurrentRound
      ) {
        settingsWatchSync.lock = true;
        settings.value.status = normalizedStatus;
        settings.value.currentRound = normalizedCurrentRound;
        setTimeout(() => {
          settingsWatchSync.lock = false;
        }, 100);
      }

      competition.value.status = normalizedStatus as CompetitionRunStatus;
      competition.value.published = state.published;
      competition.value.currentRound = normalizedCurrentRound;
      competition.value.roundsEnabled = [...state.roundsEnabled];
      notify({ type: 'positive', message: 'Nastavenia uložené' });
    } catch (err: unknown) {
      notify({ type: 'negative', message: serverErrorMessage(err) });
    }
  }

  async function saveCompetitionMeta(): Promise<void> {
    if (!competitionId.value || settingsWatchSync.lock) return;
    const name = settingsMeta.value.name.trim();
    const date = settingsMeta.value.date;
    const description = settingsMeta.value.description.trim();
    const location = settingsMeta.value.location.trim();

    const unchanged =
      competition.value.name === name &&
      competition.value.date === date &&
      (competition.value.description || '') === description &&
      (competition.value.location || '') === location;
    if (unchanged) return;

    try {
      await api.put(`/competitions/${competitionId.value}`, {
        name,
        date,
        description: description || null,
        location: location || null,
      });
      competition.value.name = name;
      competition.value.date = date;
      competition.value.description = description;
      competition.value.location = location;
      settingsMeta.value = { name, date, description, location };
      notify({ type: 'positive', message: 'Nastavenia uložené' });
    } catch (err: unknown) {
      settingsMeta.value = {
        name: competition.value.name,
        date: competition.value.date,
        description: competition.value.description || '',
        location: competition.value.location || '',
      };
      notify({ type: 'negative', message: serverErrorMessage(err) });
    }
  }

  return {
    competitionId,
    loading,
    competition,
    cats,
    judges,
    judgesList,
    groups,
    groupOptions,
    evaluations,
    exhibitors,
    exhibitorOptions,
    judgingOrders,
    competitionRolesList,
    systemUsers,
    overallProgress,
    bisFinalists,
    settings,
    settingsMeta,
    ratedCatsCount,
    systemUserSelectOptions,
    loadDashboard,
    loadJudges,
    loadJudgingOrders,
    loadSystemUsers,
    saveCompetitionMeta,
    pushSettingsToServer,
    notify,
    serverErrorMessage,
  };
}

export function provideAdminCompetition(): AdminCompetitionContext {
  const ctx = createAdminCompetitionContext();
  provide(ADMIN_CTX_KEY, ctx);
  return ctx;
}

export function useAdminCompetition(): AdminCompetitionContext {
  const ctx = inject(ADMIN_CTX_KEY);
  if (!ctx) {
    throw new Error('useAdminCompetition() called outside of <AdminPage> tree');
  }
  return ctx;
}

/** Popisky stavov a kôl, používané vo viacerých admin taboch. */
export const STATUS_LABEL_MAP: Record<string, string> = {
  scheduled: 'Ešte nezačala',
  active: 'Prebieha',
  paused: 'Pozastavená',
  finished: 'Ukončená',
};

export const ROUND_LABEL_MAP: Record<string, string> = {
  nomination: 'Nominácia',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  bis: 'BIS / Finále',
};

export function getCatStatusColor(status: string): string {
  switch (status) {
    case 'Ohodnotená':
      return 'green';
    case 'Hodnotí sa':
      return 'orange';
    case 'Volaná':
      return 'blue';
    case 'Čaká':
      return 'grey-7';
    default:
      return 'grey';
  }
}

export function getCatStatusTextColor(status: string): string {
  return status === 'Čaká' ? 'grey-8' : 'white';
}
