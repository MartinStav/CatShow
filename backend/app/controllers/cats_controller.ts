import type { HttpContext } from '@adonisjs/core/http'
import Cat from '#models/cat'
import Evaluation from '#models/evaluation'
import Judge from '#models/judge'
import { getNominationCatScope } from '#utils/nomination_cat_scope'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { canRoundRunNow, isSetupLocked } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'
import db from '@adonisjs/lucid/services/db'
import { webPushService } from '#services/web_push_service'

function normalizeCatGroups(rawGroups: unknown, rawGroup: unknown): string[] {
  if (Array.isArray(rawGroups)) {
    const cleaned = rawGroups
      .filter((g): g is string => typeof g === 'string')
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
    if (cleaned.length > 0) return [...new Set(cleaned)]
  }
  if (typeof rawGroup === 'string' && rawGroup.trim().length > 0) {
    return [rawGroup.trim()]
  }
  return []
}

export default class CatsController {
  async index(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const group = request.input('group')
    const nominationForMe =
      request.input('nominationForMe') === 'true' || request.input('nominationForMe') === '1'

    const query = Cat.query().where('competitionId', competition.id).preload('exhibitor')
    if (group) {
      query.where((q) => {
        q.where('group', group).orWhereRaw('? = ANY(groups)', [group])
      })
    }

    if (nominationForMe) {
      const user = auth.user
      if (!user) {
        return response.unauthorized({ message: 'Vyžaduje sa prihlásenie.' })
      }
      const judge = await Judge.query()
        .where('competitionId', competition.id)
        .where('userId', user.id)
        .first()
      if (!judge) {
        return response.ok([])
      }
      const scope = await getNominationCatScope(competition.id, judge.id)
      if (scope.kind === 'assigned') {
        if (scope.catIds.length === 0) {
          return response.ok([])
        }
        query.whereIn('id', scope.catIds)
      }
    }

    const cats = await query.orderBy('registrationNumber', 'asc')
    return response.ok(cats)
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const cat = await Cat.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .preload('exhibitor')
      .preload('evaluations', (q) => q.preload('judge'))
      .firstOrFail()
    return response.ok(cat)
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné pridávať nové mačky.',
      })
    }

    const data = request.only([
      'registrationNumber',
      'name',
      'breed',
      'group',
      'groups',
      'class',
      'sex',
      'age',
      'exhibitorId',
      'status',
    ]) as Record<string, unknown>
    const groups = normalizeCatGroups(data.groups, data.group)
    if (groups.length > 0) {
      data.groups = groups
      data.group = groups[0]
    }
    // Map JSON `class` -> model property `catClass` (kvôli rezervovanému slovu)
    if (typeof data.class === 'string') {
      const trimmed = data.class.trim()
      data.catClass = trimmed.length > 0 ? trimmed : null
    }
    delete data.class

    if (!data.exhibitorId) {
      return response.badRequest({
        message: 'Mačka musí mať priradeného majiteľa (vystavovateľa).',
      })
    }

    const cat = await Cat.create({ ...(data as Partial<Cat>), competitionId: competition.id })
    await cat.load('exhibitor')
    await writeAuditLog({
      action: 'cat.created',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'cat',
      entityId: cat.id,
      payload: { registrationNumber: cat.registrationNumber, group: cat.group },
    })
    return response.created(cat)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const cat = await Cat.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const data = request.only([
      'registrationNumber',
      'name',
      'breed',
      'group',
      'groups',
      'class',
      'sex',
      'age',
      'exhibitorId',
      'status',
    ]) as Record<string, unknown>
    const groups = normalizeCatGroups(data.groups, data.group)
    if (groups.length > 0) {
      data.groups = groups
      data.group = groups[0]
    }
    if (typeof data.class === 'string') {
      const trimmed = data.class.trim()
      data.catClass = trimmed.length > 0 ? trimmed : null
    }
    delete data.class

    if (!data.exhibitorId && data.exhibitorId !== undefined) {
      return response.badRequest({
        message: 'Mačka musí mať priradeného majiteľa (vystavovateľa).',
      })
    }

    const oldStatus = cat.status
    const newStatus = data.status

    if (isSetupLocked(competition)) {
      const updatesOnlyStatus =
        Object.keys(data).every((k) => k === 'status') || Object.keys(data).length === 0
      if (!updatesOnlyStatus) {
        return response.conflict({
          message: 'Počas aktívneho kola je možné meniť len stav mačky.',
        })
      }
      if (newStatus && newStatus !== oldStatus) {
        const roundCheck = canRoundRunNow(competition, competition.currentRound!)
        if (!roundCheck.ok) {
          return response.conflict({ message: roundCheck.message })
        }
      }
    }

    if (oldStatus === 'completed' && newStatus !== 'completed' && newStatus !== undefined) {
      const deleteEvaluations = request.input('deleteEvaluations', false)
      if (deleteEvaluations) {
        await Evaluation.query()
          .where('catId', cat.id)
          .where('competitionId', competition.id)
          .delete()
      }
    }

    await db.transaction(async (trx) => {
      cat.useTransaction(trx)
      cat.merge(data as Partial<Cat>)
      await cat.save()
    })
    await cat.load('exhibitor')
    await writeAuditLog({
      action: 'cat.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'cat',
      entityId: cat.id,
      payload: { fromStatus: oldStatus, toStatus: cat.status },
    })
    if (oldStatus !== cat.status && cat.exhibitor?.userId) {
      await webPushService.sendCatStatusChanged({
        userId: cat.exhibitor.userId,
        competitionId: competition.id,
        competitionName: competition.name,
        catName: cat.name,
        catId: cat.id,
        oldStatus,
        newStatus: cat.status,
      })
    }
    return response.ok(cat)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné mazať mačky.',
      })
    }

    const cat = await Cat.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    try {
      await cat.delete()
      await writeAuditLog({
        action: 'cat.deleted',
        userId: user.id,
        competitionId: competition.id,
        entityType: 'cat',
        entityId: cat.id,
      })
      return response.noContent()
    } catch (error) {
      return response.conflict({
        message:
          'Mačku nie je možné odstrániť, pravdepodobne má priradené hodnotenia. Najprv vymažte hodnotenia.',
      })
    }
  }
}
