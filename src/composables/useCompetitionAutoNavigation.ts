import { watch, onUnmounted, type MaybeRefOrGetter, toValue } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { api } from 'src/boot/axios';
import { isLiveViewFullPath } from 'src/stores/liveNavigation';
import { useCompetitionRealtime } from 'src/composables/useCompetitionRealtime';

type CompSnapshot = { status: string; currentRound: string | null };

const ROUND_TO_JUDGE_SEGMENT: Record<string, string> = {
  nomination: 'nomination-evaluation',
  ring1: 'ring-phase-1',
  ring2: 'ring-phase-2',
  bis: 'bis-finals',
};

function pathOnly(p: string): string {
  const i = p.indexOf('?');
  return i === -1 ? p : p.slice(0, i);
}

function isCompetitionAdminPath(cid: number, path: string): boolean {
  return pathOnly(path) === `/competition/${cid}/admin`;
}

function isJudgeWorkflowPath(cid: number, path: string): boolean {
  const base = pathOnly(path);
  const segs = Object.values(ROUND_TO_JUDGE_SEGMENT);
  return segs.some((s) => base === `/competition/${cid}/${s}`);
}

function canonicalJudgePath(cid: number, snap: CompSnapshot): string | null {
  if (snap.status === 'finished') {
    return `/competition/${cid}/results`;
  }
  const r = snap.currentRound;
  if (!r) return null;
  const seg = ROUND_TO_JUDGE_SEGMENT[r];
  if (!seg) return null;
  return `/competition/${cid}/${seg}`;
}

function targetForJudgePath(cid: number, currentPath: string, snap: CompSnapshot): string | null {
  if (!isJudgeWorkflowPath(cid, currentPath)) return null;
  return canonicalJudgePath(cid, snap);
}

function targetForLiveWhenFinished(cid: number, currentPath: string, snap: CompSnapshot): string | null {
  if (snap.status !== 'finished') return null;
  const p = pathOnly(currentPath);
  if (p === `/competition/${cid}/results`) return null;
  if (!p.startsWith(`/competition/${cid}/`)) return null;
  if (!isLiveViewFullPath(currentPath)) return null;
  return `/competition/${cid}/results`;
}

/** Len cesty kde zmena fázy alebo ukončenia súťaže vyžaduje presmerovanie. */
function pathNeedsPhaseSync(cid: number, path: string): boolean {
  return isJudgeWorkflowPath(cid, path) || isLiveViewFullPath(path);
}

/** Pri zmene fázy/ukončení súťaže presmeruje rozhodcu a živý náhľad na správnu obrazovku. */
export function useCompetitionAutoNavigation(opts: {
  competitionId: MaybeRefOrGetter<number | null | undefined>;
  route: RouteLocationNormalizedLoaded;
  router: Router;
}) {
  const authStore = useAuthStore();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function syncOnce() {
    const cidRaw = toValue(opts.competitionId);
    if (cidRaw == null || !Number.isFinite(Number(cidRaw))) return;
    const cid = Math.floor(Number(cidRaw));
    if (cid < 1) return;
    if (authStore.token && authStore.user?.mustChangePassword) return;

    const curPath = opts.route.fullPath ?? opts.route.path;
    const p = opts.route.path || pathOnly(curPath);

    if (!pathNeedsPhaseSync(cid, p)) return;

    if (authStore.token && isCompetitionAdminPath(cid, p)) {
      return;
    }

    try {
      const snap: CompSnapshot = authStore.token
        ? await fetchSnapshotAuth(cid)
        : await fetchSnapshotPublic(cid);

      const target =
        targetForJudgePath(cid, curPath, snap) ??
        targetForLiveWhenFinished(cid, curPath, snap);

      if (target != null && pathOnly(curPath) !== pathOnly(target)) {
        await opts.router.replace(target);
      }
    } catch {
      /* noop */
    }
  }

  async function fetchSnapshotAuth(cid: number): Promise<CompSnapshot> {
    const { data } = await api.get<{ status: string; currentRound: string | null }>(
      `/competitions/${cid}`,
    );
    return { status: data.status, currentRound: data.currentRound ?? null };
  }

  async function fetchSnapshotPublic(cid: number): Promise<CompSnapshot> {
    const { data } = await api.get<{ competition: { status: string; currentRound: string | null } }>(
      `/live/${cid}/scoring`,
    );
    return {
      status: data.competition.status,
      currentRound: data.competition.currentRound ?? null,
    };
  }

  function scheduleSync() {
    const id = resolvedId();
    if (id == null) return;
    const p = opts.route.path ?? pathOnly(opts.route.fullPath ?? '');
    if (!pathNeedsPhaseSync(id, p)) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void syncOnce();
    }, 320);
  }

  const resolvedId = (): number | null => {
    const raw = toValue(opts.competitionId);
    if (raw == null || !Number.isFinite(Number(raw))) return null;
    const n = Math.floor(Number(raw));
    return n >= 1 ? n : null;
  };

  useCompetitionRealtime({
    competitionId: opts.competitionId,
    onInvalidate: scheduleSync,
  });

  watch(
    () => [resolvedId(), opts.route.fullPath],
    ([id]) => {
      if (id == null) return;
      scheduleSync();
    },
    { immediate: true },
  );

  pollTimer = setInterval(() => {
    const id = resolvedId();
    if (id == null) return;
    const p = opts.route.path ?? pathOnly(opts.route.fullPath ?? '');
    if (!pathNeedsPhaseSync(id, p)) return;
    void syncOnce();
  }, 12000);

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  });
}
