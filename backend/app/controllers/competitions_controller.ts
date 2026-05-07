import type { HttpContext } from '@adonisjs/core/http'
import Competition from '#models/competition'
import Evaluation from '#models/evaluation'
import Judge from '#models/judge'
import Cat from '#models/cat'
import JudgingOrder from '#models/judging_order'
import NominationPhaseCompletion from '#models/nomination_phase_completion'
import Ring1RankingCompletion from '#models/ring1_ranking_completion'
import Ring2RankingCompletion from '#models/ring2_ranking_completion'
import { ensureCompetitionAccess } from '#utils/competition_access'
import {
  validateCompetitionTransition,
  ALL_COMPETITION_ROUNDS,
  enabledRoundsFromList,
  type CompetitionRound,
} from '#utils/competition_flow'
import {
  userCanFinishCompetition,
  judgeNominationIncompleteMessage,
  judgeRing1IncompleteMessage,
  judgeRing2IncompleteMessage,
  computeCurrentRoundJudgeProgress,
} from '#utils/competition_progress'
import { writeAuditLog } from '#utils/event_audit'
import {
  applyRunTimerAfterStatusChange,
  initializeRunTimerForNewCompetition,
} from '#utils/competition_run_timer'
import db from '@adonisjs/lucid/services/db'

export default class CompetitionsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    let competitions
    if (user.role === 'superadmin') {
      competitions = await Competition.query().orderBy('date', 'desc').preload('groups')
    } else if (user.role === 'admin') {
      competitions = await Competition.query()
        .where((q) => {
          q.where('published', true)
            .orWhereHas('competitionRoles', (r) => {
              r.where('userId', user.id)
            })
            .orWhereHas('judges', (j) => {
              j.where('userId', user.id).orWhere('stewardUserId', user.id)
            })
            .orWhereHas('exhibitors', (e) => {
              e.where('userId', user.id)
            })
            .orWhere('createdById', user.id)
        })
        .orderBy('date', 'desc')
        .preload('groups')
    } else {
      competitions = await Competition.query()
        .where((q) => {
          q.where('published', true)
            .orWhereHas('competitionRoles', (r) => {
              r.where('userId', user.id)
            })
            .orWhereHas('judges', (j) => {
              j.where('userId', user.id).orWhere('stewardUserId', user.id)
            })
            .orWhereHas('exhibitors', (e) => {
              e.where('userId', user.id)
            })
        })
        .orderBy('date', 'desc')
        .preload('groups')
    }

    return response.ok(competitions)
  }

  /**
   * Potvrdenie nominácie sudcom. Až keď všetci priradení sudcovia potvrdia,
   * súťaž prejde do paused (ak je v nastaveniach ring) alebo finished (bez ringu).
   */
  async completeNomination(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'operate')
    if (!competition) return

    if (competition.status !== 'active' || competition.currentRound !== 'nomination') {
      return response.badRequest({
        message: 'Nomináciu teraz nie je možné potvrdiť (nie je aktívna fáza nominácie).',
      })
    }

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('userId', user.id)
      .first()

    if (!judge) {
      return response.forbidden({ message: 'Nemáte priradený záznam rozhodcu v tejto súťaži.' })
    }

    const myErr = await judgeNominationIncompleteMessage(competition.id, judge.id)
    if (myErr) {
      return response.badRequest({ message: myErr })
    }

    await NominationPhaseCompletion.updateOrCreate(
      { competitionId: competition.id, judgeId: judge.id },
      {}
    )

    const judgesWithUser = await Judge.query()
      .where('competitionId', competition.id)
      .whereNotNull('userId')

    if (judgesWithUser.length === 0) {
      return response.badRequest({ message: 'V súťaži chýba rozhodca s priradeným používateľom.' })
    }

    const judgeIds = judgesWithUser.map((j) => j.id)
    const completions = await NominationPhaseCompletion.query()
      .where('competitionId', competition.id)
      .whereIn('judgeId', judgeIds)

    if (completions.length < judgeIds.length) {
      await competition.refresh()
      return response.ok({ competition, allJudgesDone: false })
    }

    for (const j of judgesWithUser) {
      const err = await judgeNominationIncompleteMessage(competition.id, j.id)
      if (err) {
        return response.badRequest({ message: err })
      }
    }

    const rounds = competition.roundsEnabled ?? []
    const hasRing = rounds.includes('ring1') || rounds.includes('ring2')

    const previousRunStatus = competition.status
    if (hasRing) {
      competition.status = 'paused'
      competition.currentRound = null
    } else {
      competition.status = 'finished'
      competition.currentRound = null
    }
    applyRunTimerAfterStatusChange(competition, previousRunStatus, competition.status)
    await competition.save()
    await writeAuditLog({
      action: 'competition.nomination.completed',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
      payload: { nextStatus: competition.status, nextRound: competition.currentRound },
    })

    return response.ok({ competition, allJudgesDone: true })
  }

  /**
   * Odovzdanie Ring 1 daným sudcom (bez zmeny aktuálneho kola súťaže).
   * Rozhodca čaká na prepnutie súťaže do Ring 2 v administrácii.
   */
  async completeRing1Ranking(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'operate')
    if (!competition) return

    if (competition.status !== 'active' || competition.currentRound !== 'ring1') {
      return response.badRequest({
        message: 'Ring 1 teraz nie je možné odovzdať (nie je aktívny ring 1).',
      })
    }

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('userId', user.id)
      .first()

    if (!judge) {
      return response.forbidden({ message: 'Nemáte priradený záznam rozhodcu v tejto súťaži.' })
    }

    const myErr = await judgeRing1IncompleteMessage(competition.id, judge.id)
    if (myErr) {
      return response.badRequest({ message: myErr })
    }

    await Ring1RankingCompletion.updateOrCreate(
      { competitionId: competition.id, judgeId: judge.id },
      {}
    )

    await writeAuditLog({
      action: 'competition.ring1.ranking.completed',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
      payload: { judgeId: judge.id },
    })

    return response.ok({ message: 'Ring 1 bol odovzdaný.' })
  }

  /**
   * Potvrdenie odovzdania poradia v ringu 2 daným sudcom (bez zmeny stavu súťaže).
   */
  async completeRing2Ranking(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'operate')
    if (!competition) return

    if (competition.status !== 'active' || competition.currentRound !== 'ring2') {
      return response.badRequest({
        message: 'Poradie v ringu 2 teraz nie je možné odovzdať (nie je aktívny ring 2).',
      })
    }

    const judge = await Judge.query()
      .where('competitionId', competition.id)
      .where('userId', user.id)
      .first()

    if (!judge) {
      return response.forbidden({ message: 'Nemáte priradený záznam rozhodcu v tejto súťaži.' })
    }

    const myErr = await judgeRing2IncompleteMessage(competition.id, judge.id)
    if (myErr) {
      return response.badRequest({ message: myErr })
    }

    await Ring2RankingCompletion.updateOrCreate(
      { competitionId: competition.id, judgeId: judge.id },
      {}
    )

    await writeAuditLog({
      action: 'competition.ring2.ranking.completed',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
      payload: { judgeId: judge.id },
    })

    return response.ok({ message: 'Poradie bolo odovzdané.' })
  }

  async publicIndex({ response }: HttpContext) {
    const competitions = await Competition.query().where('published', true).orderBy('date', 'desc')

    return response.ok(
      competitions.map((c) => ({
        id: c.id,
        name: c.name,
        date: c.date,
        status: c.status,
        published: c.published,
        currentRound: c.currentRound,
        roundsEnabled: c.roundsEnabled ?? [],
      }))
    )
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx
    const competitionBase = await ensureCompetitionAccess(ctx, params.id, 'read')
    if (!competitionBase) return

    const competition = await Competition.query()
      .where('id', competitionBase.id)
      .preload('cats', (q) => q.preload('exhibitor'))
      .preload('judges')
      .preload('groups')
      .firstOrFail()

    return response.ok(competition)
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return response.forbidden({ message: 'Súťaž môže vytvoriť iba admin alebo superadmin.' })
    }
    const data = request.only([
      'name',
      'date',
      'description',
      'location',
      'status',
      'published',
      'currentRound',
      'roundsEnabled',
    ])
    // Predvolene všetky štandardné kolá. Ak klient pošle neprázdne `roundsEnabled`,
    // použije sa (nominácia sa vždy dopočíta v enabledRoundsFromList).
    const roundsRequested =
      Array.isArray(data.roundsEnabled) && data.roundsEnabled.length > 0
        ? data.roundsEnabled
        : [...ALL_COMPETITION_ROUNDS]
    const canonicalRounds = enabledRoundsFromList(roundsRequested)
    const currentRound = (data as { currentRound?: CompetitionRound | null }).currentRound ?? null
    const status = (data.status ?? (currentRound ? 'active' : 'scheduled')) as
      | 'active'
      | 'paused'
      | 'finished'
      | 'scheduled'
    const competition = await Competition.create({
      ...data,
      createdById: user.id,
      roundsEnabled: canonicalRounds,
    })
    const transitionCheck = validateCompetitionTransition(competition, {
      status,
      currentRound,
      roundsEnabled: canonicalRounds,
    })
    if (!transitionCheck.ok) {
      await competition.delete()
      return response.badRequest({ message: transitionCheck.message })
    }
    competition.status = transitionCheck.normalized.status
    competition.currentRound = transitionCheck.normalized.currentRound
    competition.roundsEnabled = canonicalRounds
    initializeRunTimerForNewCompetition(competition)
    await competition.save()

    await writeAuditLog({
      action: 'competition.created',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
      payload: { status: competition.status, currentRound: competition.currentRound },
    })
    return response.created(competition)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'manage')
    if (!competition) return

    const data = request.only([
      'name',
      'date',
      'description',
      'location',
      'status',
      'published',
      'currentRound',
      'roundsEnabled',
    ])

    const nextStatus = (data.status ?? competition.status) as
      | 'active'
      | 'paused'
      | 'finished'
      | 'scheduled'
    const nextRound = (data.currentRound ?? competition.currentRound) as CompetitionRound | null
    const nextRoundsEnabled = (data.roundsEnabled ?? competition.roundsEnabled) as string[]

    const transition = validateCompetitionTransition(competition, {
      status: nextStatus,
      currentRound: nextRound,
      roundsEnabled: nextRoundsEnabled,
    })
    if (!transition.ok) {
      return response.badRequest({ message: transition.message })
    }

    const { status: coercedStatus, currentRound: coercedRound } = transition.normalized

    if (coercedStatus === 'finished' && competition.status !== 'finished') {
      const allowed = await userCanFinishCompetition(user, competition.id)
      if (!allowed) {
        return response.forbidden({
          message:
            'Súťaž môže ukončiť iba systémový administrátor alebo administrátor súťaže. Ukončenie vykonajte v administrácii (Nastavenia).',
        })
      }
    }

    const previousRunStatus = competition.status
    const previousRound = competition.currentRound
    await db.transaction(async (trx) => {
      competition.useTransaction(trx)
      applyRunTimerAfterStatusChange(competition, previousRunStatus, coercedStatus)
      const mergedRounds = Array.isArray(nextRoundsEnabled) ? nextRoundsEnabled : []
      competition.merge({
        ...data,
        status: coercedStatus,
        currentRound: coercedRound,
        roundsEnabled: [...new Set([...mergedRounds, 'nomination'])],
      })

      if (competition.currentRound === 'nomination' && previousRound !== 'nomination') {
        await NominationPhaseCompletion.query({ client: trx })
          .where('competitionId', competition.id)
          .delete()
      }

      if (competition.currentRound === 'ring2' && previousRound !== 'ring2') {
        await Ring2RankingCompletion.query({ client: trx })
          .where('competitionId', competition.id)
          .delete()
      }

      const enteringRing =
        (competition.currentRound === 'ring1' || competition.currentRound === 'ring2') &&
        competition.currentRound !== previousRound
      if (enteringRing) {
        await Cat.query({ client: trx })
          .where('competitionId', competition.id)
          .update({ status: 'waiting' })
      }

      if (competition.currentRound === 'ring1' && previousRound !== 'ring1') {
        await JudgingOrder.query({ client: trx })
          .where('competitionId', competition.id)
          .update({ ring1ProtocolCallStatus: 'waiting' })
      }

      if (competition.currentRound === 'ring2' && previousRound !== 'ring2') {
        await JudgingOrder.query({ client: trx })
          .where('competitionId', competition.id)
          .update({ ring2ProtocolCallStatus: 'waiting' })
      }

      await competition.save()
    })

    await writeAuditLog({
      action: 'competition.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
      payload: data,
    })

    return response.ok(competition)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'manage')
    if (!competition) return
    await competition.delete()
    await writeAuditLog({
      action: 'competition.deleted',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
    })
    return response.noContent()
  }

  async dashboard(ctx: HttpContext) {
    const { params, response } = ctx
    const competitionAccess = await ensureCompetitionAccess(ctx, params.id, 'read')
    if (!competitionAccess) return

    const competition = await Competition.query()
      .where('id', competitionAccess.id)
      .preload('cats', (q) => q.preload('exhibitor'))
      .preload('judges')
      .preload('groups')
      .firstOrFail()

    const cats = competition.cats
    const totalCats = cats.length

    const evaluations = await Evaluation.query().where('competitionId', competition.id)

    const evaluatedCatIds = new Set(evaluations.map((e) => e.catId))
    const ratedCats = cats.filter((c) => evaluatedCatIds.has(c.id)).length
    const overallProgress = await computeCurrentRoundJudgeProgress({
      competitionId: competition.id,
      currentRound: competition.currentRound,
      judges: competition.judges.map((j) => ({ id: j.id, userId: j.userId })),
    })

    const bisNominations = evaluations.filter((e) => e.nomBis).length

    const groupStats = competition.groups.map((group) => {
      const groupCats = cats.filter((c) => c.group === group.name)
      const rated = groupCats.filter((c) => evaluatedCatIds.has(c.id)).length
      const total = groupCats.length
      const progress = total > 0 ? Math.round((rated / total) * 100) : 0
      const activeCat = groupCats.find((c) => c.status === 'judging' || c.status === 'called')
      return {
        name: group.name,
        progress,
        total,
        rated,
        currentCat: activeCat?.name || null,
      }
    })

    return response.ok({
      competition: {
        id: competition.id,
        name: competition.name,
        date: competition.date,
        description: competition.description,
        location: competition.location,
        status: competition.status,
        published: competition.published,
        currentRound: competition.currentRound,
        roundsEnabled: competition.roundsEnabled,
      },
      summary: {
        totalCats,
        totalJudges: competition.judges.length,
        ratedCats,
        bisFinalists: bisNominations,
        overallProgress,
      },
      groups: groupStats,
      judges: competition.judges.map((j) => ({
        id: j.id,
        name: j.name,
      })),
    })
  }
}
