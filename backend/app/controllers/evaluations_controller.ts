import type { HttpContext } from '@adonisjs/core/http'
import Evaluation from '#models/evaluation'
import { assertNominationEvaluationAllowed } from '#utils/nomination_cat_scope'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { canRoundRunNow } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'
import Exhibitor from '#models/exhibitor'
import CompetitionRole from '#models/competition_role'
import NominationPhaseCompletion from '#models/nomination_phase_completion'
import Ring1RankingCompletion from '#models/ring1_ranking_completion'
import Ring2RankingCompletion from '#models/ring2_ranking_completion'
import Judge from '#models/judge'

const VALID_ROUNDS = new Set(['nomination', 'ring1', 'ring2'])

function coerceGradeValue(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t.length > 0 ? t : null
  }
  return null
}

/** Bez grade platia v nominácii tituly ani NomBIS. */
function applyNominationGradeRules(evaluation: Evaluation) {
  if (evaluation.round !== 'nomination') return
  if (evaluation.grade !== null && evaluation.grade !== undefined && evaluation.grade !== '') return
  evaluation.grade = null
  evaluation.nomBis = false
  evaluation.titles = []
}

const RING2_EVAL_LOCKED_MESSAGE =
  'Odovzdanie poradia je potvrdené. \u00dapravy sú povolené až po odomknutí administrátorom.'

const RING1_EVAL_LOCKED_MESSAGE =
  'Odovzdanie Ring 1 je potvrdené. \u00dapravy sú povolené až po odomknutí administrátorom.'

/** Jeden sudca = max. jedna NomBIS mačka v nominácii (dedup ostatných). */
async function dedupNominationNomBis(
  competitionId: number,
  judgeId: number | null,
  savedEvaluation?: Evaluation
) {
  if (judgeId === null || judgeId === undefined) return
  const trues = await Evaluation.query()
    .where('competitionId', competitionId)
    .where('round', 'nomination')
    .where('judgeId', judgeId)
    .where('nomBis', true)
    .orderBy('updatedAt', 'desc')
    .orderBy('id', 'desc')

  if (trues.length <= 1) return

  let keeper: Evaluation | undefined
  if (
    savedEvaluation &&
    savedEvaluation.nomBis === true &&
    savedEvaluation.judgeId === judgeId &&
    savedEvaluation.round === 'nomination'
  ) {
    keeper = trues.find((t) => t.id === savedEvaluation.id)
  }
  if (!keeper) {
    keeper = trues[0]
  }
  if (!keeper) return

  const loserIds = trues.filter((t) => t.id !== keeper.id).map((t) => t.id)
  if (loserIds.length === 0) return

  await Evaluation.query().whereIn('id', loserIds).update({ nomBis: false })
}

async function isJudgeNominationLocked(
  competitionId: number,
  userId: number,
  judgeId: number | null | undefined
): Promise<boolean> {
  if (judgeId === null || judgeId === undefined) return false
  const ownJudge = await Judge.query()
    .where('competitionId', competitionId)
    .where('userId', userId)
    .first()
  if (!ownJudge || ownJudge.id !== judgeId) return false

  const completion = await NominationPhaseCompletion.query()
    .where('competitionId', competitionId)
    .where('judgeId', ownJudge.id)
    .first()
  return !!completion
}

async function isJudgeRing1Locked(
  competitionId: number,
  userId: number,
  judgeId: number | null | undefined
): Promise<boolean> {
  if (judgeId === null || judgeId === undefined) return false
  const ownJudge = await Judge.query()
    .where('competitionId', competitionId)
    .where('userId', userId)
    .first()
  if (!ownJudge || ownJudge.id !== judgeId) return false

  const completion = await Ring1RankingCompletion.query()
    .where('competitionId', competitionId)
    .where('judgeId', ownJudge.id)
    .first()
  return !!completion
}

async function isJudgeRing2Locked(
  competitionId: number,
  userId: number,
  judgeId: number | null | undefined
): Promise<boolean> {
  if (judgeId === null || judgeId === undefined) return false
  const ownJudge = await Judge.query()
    .where('competitionId', competitionId)
    .where('userId', userId)
    .first()
  if (!ownJudge || ownJudge.id !== judgeId) return false

  const completion = await Ring2RankingCompletion.query()
    .where('competitionId', competitionId)
    .where('judgeId', ownJudge.id)
    .first()
  return !!completion
}

/** Stevard / súťažný sudca / admín súťaže – vidí nominácie aj pred zverejnením výstavcovi. */
async function userBypassesExhibitorNominationFilter(competitionId: number, userId: number) {
  const roleHit = await CompetitionRole.query()
    .where('competitionId', competitionId)
    .where('userId', userId)
    .whereIn('role', ['steward', 'judge', 'administrator'])
    .first()
  if (roleHit) return true

  const judgeHit = await Judge.query()
    .where('competitionId', competitionId)
    .where((q) => q.where('userId', userId).orWhere('stewardUserId', userId))
    .first()
  return !!judgeHit
}

export default class EvaluationsController {
  async index(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const round = request.input('round')
    const catId = request.input('catId')

    const query = Evaluation.query()
      .where('competitionId', competition.id)
      .preload('cat')
      .preload('judge')

    if (round) query.where('round', round)
    if (catId) query.where('catId', catId)

    let evaluations = await query.orderBy('createdAt', 'asc')

    // Exhibitors should only see nomination results after the judge confirms nomination.
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      const exhibitorRow = await Exhibitor.query()
        .where('competitionId', competition.id)
        .where('userId', user.id)
        .first()

      if (exhibitorRow) {
        const bypass = await userBypassesExhibitorNominationFilter(competition.id, user.id)
        if (!bypass) {
          const completionRows = await NominationPhaseCompletion.query()
            .where('competitionId', competition.id)
            .select('judgeId')
          const confirmedJudgeIds = new Set(completionRows.map((r) => r.judgeId))

          evaluations = evaluations.filter((ev) => {
            if (ev.round !== 'nomination') return true
            if (ev.judgeId === null) return false
            return confirmedJudgeIds.has(ev.judgeId)
          })
        }
      }
    }

    return response.ok(evaluations)
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const data = request.only([
      'catId',
      'judgeId',
      'round',
      'grade',
      'titles',
      'position',
      'accepted',
      'nomBis',
    ])

    if (!VALID_ROUNDS.has(String(data.round))) {
      return response.badRequest({ message: 'Neplatné kolo hodnotenia.' })
    }
    if (data.catId === null || data.catId === undefined) {
      return response.badRequest({ message: 'catId je povinné.' })
    }

    const roundCheck = canRoundRunNow(competition, data.round)
    if (!roundCheck.ok) {
      return response.conflict({ message: roundCheck.message })
    }

    if (data.round === 'nomination' && data.judgeId !== null && data.catId !== null) {
      if (
        actor.role !== 'superadmin' &&
        actor.role !== 'admin' &&
        (await isJudgeNominationLocked(competition.id, actor.id, data.judgeId))
      ) {
        return response.conflict({
          message:
            'Odovzdanie rozhodcu je potvrdené. Úpravy sú povolené až po odomknutí administrátorom.',
        })
      }

      const check = await assertNominationEvaluationAllowed(
        competition.id,
        data.judgeId,
        data.catId
      )
      if (!check.ok) {
        return response.badRequest({ message: check.message })
      }
    }

    if (data.round === 'ring1' && data.judgeId !== null) {
      if (
        actor.role !== 'superadmin' &&
        actor.role !== 'admin' &&
        (await isJudgeRing1Locked(competition.id, actor.id, data.judgeId))
      ) {
        return response.conflict({
          message: RING1_EVAL_LOCKED_MESSAGE,
        })
      }
    }

    if (data.round === 'ring2' && data.judgeId !== null) {
      if (
        actor.role !== 'superadmin' &&
        actor.role !== 'admin' &&
        (await isJudgeRing2Locked(competition.id, actor.id, data.judgeId))
      ) {
        return response.conflict({
          message: RING2_EVAL_LOCKED_MESSAGE,
        })
      }
    }

    const evaluationQuery = Evaluation.query()
      .where('competitionId', competition.id)
      .where('catId', data.catId)
      .where('round', data.round)
    if (data.judgeId === null) {
      evaluationQuery.whereNull('judgeId')
    } else {
      evaluationQuery.where('judgeId', data.judgeId)
    }

    let evaluation = await evaluationQuery.first()
    if (evaluation) {
      evaluation.merge(data)
      evaluation.grade = coerceGradeValue(evaluation.grade)
      applyNominationGradeRules(evaluation)
      await evaluation.save()
    } else {
      const grade = coerceGradeValue(data.grade)
      let titlesPayload = Array.isArray(data.titles) ? [...(data.titles as string[])] : []
      let nomBisPayload = !!data.nomBis
      if (data.round === 'nomination' && grade === null) {
        titlesPayload = []
        nomBisPayload = false
      }
      evaluation = await Evaluation.create({
        ...(data as Record<string, unknown>),
        competitionId: competition.id,
        grade,
        titles: titlesPayload,
        nomBis: nomBisPayload,
      } as Partial<Evaluation>)
    }

    if (evaluation.round === 'nomination' && evaluation.judgeId !== null) {
      await dedupNominationNomBis(competition.id, evaluation.judgeId, evaluation)
    }

    await evaluation.load('cat')
    await evaluation.load('judge')
    await writeAuditLog({
      action: 'evaluation.upserted',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'evaluation',
      entityId: evaluation.id,
      payload: { catId: evaluation.catId, judgeId: evaluation.judgeId, round: evaluation.round },
    })
    return response.created(evaluation)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const evaluation = await Evaluation.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const data = request.only([
      'judgeId',
      'round',
      'grade',
      'titles',
      'position',
      'accepted',
      'nomBis',
    ])

    evaluation.merge(data)
    evaluation.grade = coerceGradeValue(evaluation.grade)
    applyNominationGradeRules(evaluation)
    const round = evaluation.round
    const roundCheck = canRoundRunNow(competition, round)
    if (!roundCheck.ok) {
      return response.conflict({ message: roundCheck.message })
    }

    const judgeId = evaluation.judgeId
    if (round === 'nomination' && judgeId !== null) {
      if (
        actor.role !== 'superadmin' &&
        actor.role !== 'admin' &&
        (await isJudgeNominationLocked(competition.id, actor.id, judgeId))
      ) {
        return response.conflict({
          message:
            'Odovzdanie rozhodcu je potvrdené. Úpravy sú povolené až po odomknutí administrátorom.',
        })
      }

      const check = await assertNominationEvaluationAllowed(
        competition.id,
        judgeId,
        evaluation.catId
      )
      if (!check.ok) {
        return response.badRequest({ message: check.message })
      }
    }

    if (round === 'ring1' && judgeId !== null) {
      if (
        actor.role !== 'superadmin' &&
        actor.role !== 'admin' &&
        (await isJudgeRing1Locked(competition.id, actor.id, judgeId))
      ) {
        return response.conflict({
          message: RING1_EVAL_LOCKED_MESSAGE,
        })
      }
    }

    if (round === 'ring2' && judgeId !== null) {
      if (
        actor.role !== 'superadmin' &&
        actor.role !== 'admin' &&
        (await isJudgeRing2Locked(competition.id, actor.id, judgeId))
      ) {
        return response.conflict({
          message: RING2_EVAL_LOCKED_MESSAGE,
        })
      }
    }

    await evaluation.save()
    if (evaluation.round === 'nomination' && evaluation.judgeId !== null) {
      await dedupNominationNomBis(competition.id, evaluation.judgeId, evaluation)
    }
    await evaluation.load('cat')
    await evaluation.load('judge')
    await writeAuditLog({
      action: 'evaluation.updated',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'evaluation',
      entityId: evaluation.id,
      payload: { catId: evaluation.catId, judgeId: evaluation.judgeId, round: evaluation.round },
    })
    return response.ok(evaluation)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const evaluation = await Evaluation.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    if (
      evaluation.round === 'nomination' &&
      actor.role !== 'superadmin' &&
      actor.role !== 'admin' &&
      (await isJudgeNominationLocked(competition.id, actor.id, evaluation.judgeId))
    ) {
      return response.conflict({
        message:
          'Odovzdanie rozhodcu je potvrdené. Úpravy sú povolené až po odomknutí administrátorom.',
      })
    }

    if (
      evaluation.round === 'ring1' &&
      actor.role !== 'superadmin' &&
      actor.role !== 'admin' &&
      (await isJudgeRing1Locked(competition.id, actor.id, evaluation.judgeId))
    ) {
      return response.conflict({
        message: RING1_EVAL_LOCKED_MESSAGE,
      })
    }

    if (
      evaluation.round === 'ring2' &&
      actor.role !== 'superadmin' &&
      actor.role !== 'admin' &&
      (await isJudgeRing2Locked(competition.id, actor.id, evaluation.judgeId))
    ) {
      return response.conflict({
        message: RING2_EVAL_LOCKED_MESSAGE,
      })
    }

    await evaluation.delete()
    await writeAuditLog({
      action: 'evaluation.deleted',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'evaluation',
      entityId: evaluation.id,
      payload: { catId: evaluation.catId, judgeId: evaluation.judgeId, round: evaluation.round },
    })
    return response.noContent()
  }

  async clearRound(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const round = request.input('round')
    if (!round) {
      return response.badRequest({ message: 'Round is required' })
    }
    if (!VALID_ROUNDS.has(String(round))) {
      return response.badRequest({ message: 'Neplatné kolo hodnotenia.' })
    }

    const deleted = await Evaluation.query()
      .where('competitionId', competition.id)
      .where('round', round)
      .delete()

    await writeAuditLog({
      action: 'evaluation.round.cleared',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'evaluation',
      payload: { round, deleted },
    })

    return response.ok({ deleted })
  }
}
