import BisAward from '#models/bis_award'
import Cat from '#models/cat'
import Competition from '#models/competition'
import CompetitionRole from '#models/competition_role'
import Evaluation from '#models/evaluation'
import Exhibitor from '#models/exhibitor'
import Judge from '#models/judge'
import JudgingOrder from '#models/judging_order'
import NominationPhaseCompletion from '#models/nomination_phase_completion'
import Ring1RankingCompletion from '#models/ring1_ranking_completion'
import Ring2RankingCompletion from '#models/ring2_ranking_completion'
import { competitionRealtimeHub } from '#services/competition_realtime_hub'

let hooksRegistered = false

function invalidateCompetition(competitionId: number) {
  competitionRealtimeHub.scheduleCompetitionBroadcast(competitionId)
}

/**
 * Jednorazová registrácia Lucid hooks – volá ju Realtime provider pri štarte HTTP servera.
 */
export function registerRealtimeModelHooks() {
  if (hooksRegistered) return
  hooksRegistered = true

  JudgingOrder.boot()
  JudgingOrder.after('save', (m) => invalidateCompetition(m.competitionId))
  JudgingOrder.after('delete', (m) => invalidateCompetition(m.competitionId))

  Cat.boot()
  Cat.after('save', (m) => invalidateCompetition(m.competitionId))
  Cat.after('delete', (m) => invalidateCompetition(m.competitionId))

  Evaluation.boot()
  Evaluation.after('save', (m) => invalidateCompetition(m.competitionId))
  Evaluation.after('delete', (m) => invalidateCompetition(m.competitionId))

  BisAward.boot()
  BisAward.after('save', (m) => invalidateCompetition(m.competitionId))
  BisAward.after('delete', (m) => invalidateCompetition(m.competitionId))

  Judge.boot()
  Judge.after('save', (m) => invalidateCompetition(m.competitionId))
  Judge.after('delete', (m) => invalidateCompetition(m.competitionId))

  Exhibitor.boot()
  Exhibitor.after('save', (m) => invalidateCompetition(m.competitionId))
  Exhibitor.after('delete', (m) => invalidateCompetition(m.competitionId))

  CompetitionRole.boot()
  CompetitionRole.after('save', (m) => {
    invalidateCompetition(m.competitionId)
    competitionRealtimeHub.scheduleCatalogBroadcast()
  })
  CompetitionRole.after('delete', (m) => {
    invalidateCompetition(m.competitionId)
    competitionRealtimeHub.scheduleCatalogBroadcast()
  })

  NominationPhaseCompletion.boot()
  NominationPhaseCompletion.after('save', (m) => invalidateCompetition(m.competitionId))
  NominationPhaseCompletion.after('delete', (m) => invalidateCompetition(m.competitionId))

  Ring1RankingCompletion.boot()
  Ring1RankingCompletion.after('save', (m) => invalidateCompetition(m.competitionId))
  Ring1RankingCompletion.after('delete', (m) => invalidateCompetition(m.competitionId))

  Ring2RankingCompletion.boot()
  Ring2RankingCompletion.after('save', (m) => invalidateCompetition(m.competitionId))
  Ring2RankingCompletion.after('delete', (m) => invalidateCompetition(m.competitionId))

  Competition.boot()
  Competition.after('save', (m) => {
    invalidateCompetition(m.id)
    competitionRealtimeHub.scheduleCatalogBroadcast()
  })
  Competition.after('delete', (m) => {
    invalidateCompetition(m.id)
    competitionRealtimeHub.scheduleCatalogBroadcast()
  })
}
