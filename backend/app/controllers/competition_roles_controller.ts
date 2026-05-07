import CompetitionRole from '#models/competition_role'
import Competition from '#models/competition'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { isSetupLocked } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'

export default class CompetitionRolesController {
  async index(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.id, 'read')
    if (!competition) return

    const roles = await CompetitionRole.query()
      .where('competitionId', competition.id)
      .preload('user')
      .orderBy('role', 'asc')

    return response.ok(
      roles.map((r) => ({
        id: r.id,
        userId: r.userId,
        competitionId: r.competitionId,
        role: r.role,
        user: {
          id: r.user.id,
          fullName: r.user.fullName,
          email: r.user.email,
          phone: r.user.phone,
        },
      }))
    )
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť súťažné roly.' })
    }
    await Competition.findOrFail(competition.id)

    const { userId, role } = request.only(['userId', 'role'])
    const allowedRoles = ['steward', 'judge', 'exhibitor', 'administrator', 'telka']
    if (!allowedRoles.includes(role)) {
      return response.badRequest({ message: 'Neplatná súťažná rola.' })
    }
    await User.findOrFail(userId)

    const existing = await CompetitionRole.query()
      .where('userId', userId)
      .where('competitionId', competition.id)
      .where('role', role)
      .first()

    if (existing) {
      return response.conflict({ message: 'This role assignment already exists' })
    }

    const competitionRole = await CompetitionRole.create({
      userId,
      competitionId: competition.id,
      role,
    })

    await competitionRole.load('user')
    await writeAuditLog({
      action: 'competition.role.created',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'competition_role',
      entityId: competitionRole.id,
      payload: { role, targetUserId: userId },
    })

    return response.created({
      id: competitionRole.id,
      userId: competitionRole.userId,
      competitionId: competitionRole.competitionId,
      role: competitionRole.role,
      user: {
        id: competitionRole.user.id,
        fullName: competitionRole.user.fullName,
      },
    })
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť súťažné roly.' })
    }

    const role = await CompetitionRole.query()
      .where('competitionId', competition.id)
      .where('id', params.roleId)
      .firstOrFail()

    await role.delete()
    await writeAuditLog({
      action: 'competition.role.deleted',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'competition_role',
      entityId: role.id,
      payload: { removedRole: role.role, targetUserId: role.userId },
    })
    return response.noContent()
  }
}
