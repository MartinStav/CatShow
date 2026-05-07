import type { HttpContext } from '@adonisjs/core/http'
import Exhibitor from '#models/exhibitor'
import User from '#models/user'
import { exhibitorBodyValidator } from '#validators/competition_participant'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { isSetupLocked } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'

export default class ExhibitorsController {
  async index(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const exhibitors = await Exhibitor.query()
      .where('competitionId', competition.id)
      .preload('user')
      .preload('cats')
      .orderBy('name', 'asc')
    return response.ok(exhibitors)
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const exhibitor = await Exhibitor.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .preload('user')
      .preload('cats')
      .firstOrFail()
    return response.ok(exhibitor)
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné meniť vystavovateľov.',
      })
    }

    const { userId } = await request.validateUsing(exhibitorBodyValidator)
    const linkedUser = await User.findOrFail(userId)

    const exhibitor = await Exhibitor.create({
      competitionId: competition.id,
      userId: linkedUser.id,
      name: linkedUser.fullName,
      email: linkedUser.email,
      phone: linkedUser.phone,
    })
    await exhibitor.load('user')
    await writeAuditLog({
      action: 'exhibitor.created',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'exhibitor',
      entityId: exhibitor.id,
      payload: { linkedUserId: linkedUser.id },
    })
    return response.created(exhibitor)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné meniť vystavovateľov.',
      })
    }

    const exhibitor = await Exhibitor.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const { userId } = await request.validateUsing(exhibitorBodyValidator)
    const linkedUser = await User.findOrFail(userId)

    exhibitor.merge({
      userId: linkedUser.id,
      name: linkedUser.fullName,
      email: linkedUser.email,
      phone: linkedUser.phone,
    })
    await exhibitor.save()
    await exhibitor.load('user')
    await writeAuditLog({
      action: 'exhibitor.updated',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'exhibitor',
      entityId: exhibitor.id,
      payload: { linkedUserId: linkedUser.id },
    })
    return response.ok(exhibitor)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné meniť vystavovateľov.',
      })
    }

    const exhibitor = await Exhibitor.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    await exhibitor.delete()
    await writeAuditLog({
      action: 'exhibitor.deleted',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'exhibitor',
      entityId: exhibitor.id,
    })
    return response.noContent()
  }
}
