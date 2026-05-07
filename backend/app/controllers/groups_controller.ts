import type { HttpContext } from '@adonisjs/core/http'
import Group from '#models/group'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { isSetupLocked } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'

export default class GroupsController {
  async index(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const groups = await Group.query()
      .where('competitionId', competition.id)
      .orderBy('sortOrder', 'asc')
    return response.ok(groups)
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť skupiny.' })
    }

    const data = request.only(['name', 'sortOrder'])
    const group = await Group.create({ ...data, competitionId: competition.id })
    await writeAuditLog({
      action: 'group.created',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'group',
      entityId: group.id,
      payload: { name: group.name },
    })
    return response.created(group)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť skupiny.' })
    }

    const group = await Group.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    const data = request.only(['name', 'sortOrder'])
    group.merge(data)
    await group.save()
    await writeAuditLog({
      action: 'group.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'group',
      entityId: group.id,
      payload: data,
    })
    return response.ok(group)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť skupiny.' })
    }

    const group = await Group.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    await group.delete()
    await writeAuditLog({
      action: 'group.deleted',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'group',
      entityId: group.id,
    })
    return response.noContent()
  }
}
