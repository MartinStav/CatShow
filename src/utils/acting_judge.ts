import type { RouteLocationNormalizedLoaded } from 'vue-router';

export type ActingJudgeAuth = {
  isAdmin: boolean;
  userId: number | null | undefined;
  hasCompetitionRole: (competitionId: number, roles: string[]) => boolean;
};

/** Vráti aktuálneho rozhodcu — z `?asJudgeId` (admin/súťažný admin) alebo podľa userId. */
export function resolveActingJudgeId(
  route: RouteLocationNormalizedLoaded,
  judges: { id: number; userId: number | null }[],
  auth: ActingJudgeAuth,
  competitionId: number,
): number | null {
  const canOverride = auth.isAdmin || auth.hasCompetitionRole(competitionId, ['administrator']);

  const raw = route.query.asJudgeId;
  if (canOverride && raw != null && raw !== '') {
    const n = Number(Array.isArray(raw) ? raw[0] : raw);
    if (Number.isFinite(n)) {
      const j = judges.find((x) => Number(x.id) === n);
      if (j) return j.id;
    }
  }

  const uid = auth.userId;
  if (uid == null) return null;
  const judgeForUser = judges.find((j) => j.userId != null && Number(j.userId) === Number(uid));
  return judgeForUser?.id ?? null;
}
