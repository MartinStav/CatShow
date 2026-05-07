import Competition from '#models/competition'
import CompetitionRole from '#models/competition_role'
import Exhibitor from '#models/exhibitor'
import Judge from '#models/judge'
import type { HttpContext } from '@adonisjs/core/http'

type CompetitionAccessLevel = 'read' | 'operate' | 'manage'

type AccessResult =
  | { ok: true; competition: Competition }
  | { ok: false; status: 403 | 404; message: string }

async function resolveCompetitionAccess(
  userId: number,
  userRole: string,
  competitionId: number,
  level: CompetitionAccessLevel
): Promise<AccessResult> {
  const competition = await Competition.find(competitionId)
  if (!competition) {
    return { ok: false, status: 404, message: 'Súťaž neexistuje.' }
  }

  if (userRole === 'superadmin' || userRole === 'admin') {
    return { ok: true, competition }
  }

  if (competition.createdById === userId) {
    return { ok: true, competition }
  }

  const roleRows = await CompetitionRole.query()
    .where('competitionId', competitionId)
    .where('userId', userId)
    .select('role')

  const roles = new Set(roleRows.map((r) => r.role))
  const hasManagementRole = roles.has('administrator')
  const hasOperationalRole =
    hasManagementRole ||
    roles.has('steward') ||
    roles.has('judge') ||
    roles.has('exhibitor') ||
    roles.has('telka')

  if (level === 'manage' && hasManagementRole) {
    return { ok: true, competition }
  }

  if ((level === 'operate' || level === 'read') && hasOperationalRole) {
    return { ok: true, competition }
  }

  const judgeAssignment = await Judge.query()
    .where('competitionId', competitionId)
    .where((q) => q.where('userId', userId).orWhere('stewardUserId', userId))
    .first()
  if ((level === 'operate' || level === 'read') && judgeAssignment) {
    return { ok: true, competition }
  }

  const exhibitorAssignment = await Exhibitor.query()
    .where('competitionId', competitionId)
    .where('userId', userId)
    .first()
  if ((level === 'operate' || level === 'read') && exhibitorAssignment) {
    return { ok: true, competition }
  }

  if (level === 'read' && competition.published) {
    return { ok: true, competition }
  }

  return { ok: false, status: 403, message: 'Nemáte oprávnenie pre túto súťaž.' }
}

/**
 * Použité mimo HTTP (napr. WebSocket subscribe) na overenie práva používateľa.
 */
export async function getAccessibleCompetition(
  userId: number,
  userRole: string,
  competitionId: number | string | null | undefined,
  level: CompetitionAccessLevel = 'read'
): Promise<Competition | null> {
  const idNum = typeof competitionId === 'string' ? Number(competitionId) : Number(competitionId)
  if (!Number.isFinite(idNum) || idNum < 1 || !Number.isInteger(idNum)) {
    return null
  }

  const access = await resolveCompetitionAccess(userId, userRole, idNum, level)
  return access.ok ? access.competition : null
}

export async function ensureCompetitionAccess(
  ctx: HttpContext,
  competitionIdRaw: number | string,
  level: CompetitionAccessLevel
): Promise<Competition | null> {
  const user = ctx.auth.getUserOrFail()
  const competitionId = Number(competitionIdRaw)
  if (!Number.isFinite(competitionId)) {
    ctx.response.badRequest({ message: 'Neplatné ID súťaže.' })
    return null
  }

  const access = await resolveCompetitionAccess(user.id, user.role, competitionId, level)
  if (!access.ok) {
    if (access.status === 404) {
      ctx.response.notFound({ message: access.message })
    } else {
      ctx.response.forbidden({ message: access.message })
    }
    return null
  }

  return access.competition
}
