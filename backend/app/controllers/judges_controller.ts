import type { HttpContext } from '@adonisjs/core/http'
import Judge from '#models/judge'
import User from '#models/user'
import { judgeBodyValidator, judgeStewardPatchValidator } from '#validators/competition_participant'
import { ensureStewardCompetitionRole } from '../utils/ensure_steward_competition_role.js'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { isSetupLocked } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'
import NominationPhaseCompletion from '#models/nomination_phase_completion'
import Ring1RankingCompletion from '#models/ring1_ranking_completion'
import Ring2RankingCompletion from '#models/ring2_ranking_completion'

export default class JudgesController {
  async index(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const judges = await Judge.query()
      .where('competitionId', competition.id)
      .preload('user')
      .preload('stewardUser')
      .orderBy('name', 'asc')

    const completionRows = await NominationPhaseCompletion.query()
      .where('competitionId', competition.id)
      .select('judgeId')
    const confirmedJudgeIds = new Set(completionRows.map((r) => r.judgeId))

    let ring2ConfirmedIds = new Set<number>()
    let ring1ConfirmedIds = new Set<number>()
    try {
      const ring1Rows = await Ring1RankingCompletion.query()
        .where('competitionId', competition.id)
        .select('judgeId')
      ring1ConfirmedIds = new Set(ring1Rows.map((r) => r.judgeId))
    } catch {
      ring1ConfirmedIds = new Set()
    }
    try {
      const ring2Rows = await Ring2RankingCompletion.query()
        .where('competitionId', competition.id)
        .select('judgeId')
      ring2ConfirmedIds = new Set(ring2Rows.map((r) => r.judgeId))
    } catch {
      // Napr. databáza bez migrácie ring2_ranking_completions — zoznam rozhodcov sa má vrátiť aj tak.
      ring2ConfirmedIds = new Set()
    }

    return response.ok(
      judges.map((j) => ({
        ...j.serialize(),
        nominationConfirmed: confirmedJudgeIds.has(j.id),
        ring1RankingConfirmed: ring1ConfirmedIds.has(j.id),
        ring2RankingConfirmed: ring2ConfirmedIds.has(j.id),
      }))
    )
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť rozhodcov.' })
    }

    const { userId, stewardUserId } = await request.validateUsing(judgeBodyValidator)
    await ensureStewardCompetitionRole(competition.id, stewardUserId ?? null)
    const linkedUser = await User.findOrFail(userId)

    const judge = await Judge.create({
      competitionId: competition.id,
      userId: linkedUser.id,
      name: linkedUser.fullName,
      stewardUserId: stewardUserId ?? null,
    })
    await judge.load('user')
    await judge.load('stewardUser')
    await writeAuditLog({
      action: 'judge.created',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judge',
      entityId: judge.id,
      payload: { linkedUserId: linkedUser.id, stewardUserId: judge.stewardUserId },
    })
    return response.created(judge)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť rozhodcov.' })
    }

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const { userId, stewardUserId } = await request.validateUsing(judgeBodyValidator)
    const resolvedSteward = stewardUserId !== undefined ? stewardUserId : judge.stewardUserId
    await ensureStewardCompetitionRole(competition.id, resolvedSteward)
    const user = await User.findOrFail(userId)

    judge.merge({
      userId: user.id,
      name: user.fullName,
      stewardUserId: resolvedSteward,
    })
    await judge.save()
    await judge.load('user')
    await judge.load('stewardUser')
    await writeAuditLog({
      action: 'judge.updated',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judge',
      entityId: judge.id,
      payload: { linkedUserId: user.id, stewardUserId: judge.stewardUserId },
    })
    return response.ok(judge)
  }

  async patchSteward(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const { stewardUserId } = await request.validateUsing(judgeStewardPatchValidator)
    await ensureStewardCompetitionRole(competition.id, stewardUserId)
    judge.stewardUserId = stewardUserId
    await judge.save()
    await judge.load('user')
    await judge.load('stewardUser')
    await writeAuditLog({
      action: 'judge.steward.updated',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judge',
      entityId: judge.id,
      payload: { stewardUserId: judge.stewardUserId },
    })
    return response.ok(judge)
  }

  async unlockNomination(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const deleted = await NominationPhaseCompletion.query()
      .where('competitionId', competition.id)
      .where('judgeId', judge.id)
      .delete()
    const deletedCount = Array.isArray(deleted) ? deleted.length : Number(deleted)

    if (deletedCount === 0) {
      return response.badRequest({ message: 'Rozhodca nemá potvrdené odovzdanie nominácie.' })
    }

    await writeAuditLog({
      action: 'judge.nomination.unlocked',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judge',
      entityId: judge.id,
    })

    return response.ok({ message: 'Odovzdanie rozhodcu bolo odomknuté.' })
  }

  async unlockRing1(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const deleted = await Ring1RankingCompletion.query()
      .where('competitionId', competition.id)
      .where('judgeId', judge.id)
      .delete()
    const deletedCount = Array.isArray(deleted) ? deleted.length : Number(deleted)

    if (deletedCount === 0) {
      return response.badRequest({ message: 'Rozhodca nemá potvrdené odovzdanie ringu 1.' })
    }

    await writeAuditLog({
      action: 'judge.ring1.unlocked',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judge',
      entityId: judge.id,
    })

    return response.ok({ message: 'Odovzdanie rozhodcu pre ring 1 bolo odomknuté.' })
  }

  async unlockRing2(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const deleted = await Ring2RankingCompletion.query()
      .where('competitionId', competition.id)
      .where('judgeId', judge.id)
      .delete()
    const deletedCount = Array.isArray(deleted) ? deleted.length : Number(deleted)

    if (deletedCount === 0) {
      return response.badRequest({
        message: 'Rozhodca nemá potvrdené odovzdanie poradia v ringu 2.',
      })
    }

    await writeAuditLog({
      action: 'judge.ring2.unlocked',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judge',
      entityId: judge.id,
    })

    return response.ok({ message: 'Odovzdanie poradia v ringu 2 bolo odomknuté.' })
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({ message: 'Počas aktívneho kola nie je možné meniť rozhodcov.' })
    }

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    await judge.delete()
    await writeAuditLog({
      action: 'judge.deleted',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judge',
      entityId: judge.id,
    })
    return response.noContent()
  }
}
