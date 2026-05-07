import Evaluation from '#models/evaluation'
import Group from '#models/group'
import Judge from '#models/judge'
import Cat from '#models/cat'
import { ensureCompetitionAccess } from '#utils/competition_access'
import type { HttpContext } from '@adonisjs/core/http'

export default class SystemController {
  async health({ response }: HttpContext) {
    return response.ok({
      status: 'ok',
      service: 'catshow-backend',
      now: new Date().toISOString(),
    })
  }

  async preflight(ctx: HttpContext) {
    const { params, response } = ctx
    const competitionId = Number(params.id)
    if (!Number.isFinite(competitionId)) {
      return response.badRequest({ message: 'Neplatné ID súťaže.' })
    }

    const competition = await ensureCompetitionAccess(ctx, competitionId, 'manage')
    if (!competition) return
    const [groupCount, judgeCount, catCount, evaluationCount] = await Promise.all([
      Group.query().where('competitionId', competition.id).count('* as total'),
      Judge.query().where('competitionId', competition.id).count('* as total'),
      Cat.query().where('competitionId', competition.id).count('* as total'),
      Evaluation.query().where('competitionId', competition.id).count('* as total'),
    ])

    const groups = Number(groupCount[0].$extras.total ?? 0)
    const judges = Number(judgeCount[0].$extras.total ?? 0)
    const cats = Number(catCount[0].$extras.total ?? 0)
    const evaluations = Number(evaluationCount[0].$extras.total ?? 0)

    const checks = [
      { key: 'competition_exists', ok: true, message: 'Súťaž existuje.' },
      {
        key: 'groups_present',
        ok: groups > 0,
        message: groups > 0 ? `Skupiny: ${groups}` : 'V súťaži chýbajú skupiny.',
      },
      {
        key: 'judges_present',
        ok: judges > 0,
        message: judges > 0 ? `Rozhodcovia: ${judges}` : 'V súťaži chýbajú rozhodcovia.',
      },
      {
        key: 'cats_present',
        ok: cats > 0,
        message: cats > 0 ? `Mačky: ${cats}` : 'V súťaži chýbajú mačky.',
      },
      {
        key: 'round_consistency',
        ok:
          (competition.status === 'active' && competition.currentRound !== null) ||
          (competition.status !== 'active' && competition.currentRound === null),
        message:
          competition.status === 'active'
            ? `Aktívne kolo: ${competition.currentRound ?? 'chýba'}`
            : competition.status === 'scheduled'
              ? 'Súťaž ešte nezačala (nie je nastavené aktívne kolo).'
              : 'Súťaž nie je v aktívnom kole.',
      },
      {
        key: 'evaluations_available',
        ok: evaluations >= 0,
        message: `Hodnotenia: ${evaluations}`,
      },
    ]

    return response.ok({
      competition: {
        id: competition.id,
        name: competition.name,
        status: competition.status,
        currentRound: competition.currentRound,
        roundsEnabled: competition.roundsEnabled ?? [],
      },
      checks,
      ready: checks.every((c) => c.ok),
    })
  }
}
