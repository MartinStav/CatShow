import type Competition from '#models/competition'
import type JudgingOrder from '#models/judging_order'
import type { ProtocolCallStatus } from '#models/judging_order'

type CompetitionPhaseForProtocol = 'nomination' | 'ring1' | 'ring2'

export function protocolRoundFromCompetition(
  currentRound: Competition['currentRound']
): CompetitionPhaseForProtocol | null {
  if (currentRound === 'nomination') return 'nomination'
  if (currentRound === 'ring1') return 'ring1'
  if (currentRound === 'ring2') return 'ring2'
  return null
}

/** Stav vyvolávania pre live / zobrazenie podľa fázy súťaže; `bis`/null → nominácia. */
export function effectiveProtocolForOrder(
  order: JudgingOrder,
  competitionRound: Competition['currentRound']
): ProtocolCallStatus {
  if (competitionRound === 'ring1') return order.ring1ProtocolCallStatus
  if (competitionRound === 'ring2') return order.ring2ProtocolCallStatus
  return order.protocolCallStatus
}
