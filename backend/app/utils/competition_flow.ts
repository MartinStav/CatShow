import type Competition from '#models/competition'

export type CompetitionRound = 'nomination' | 'ring1' | 'ring2' | 'bis'
export type CompetitionStatus = 'active' | 'paused' | 'finished' | 'scheduled'

/** Všetky štandardné kolá súťaže — predvolená množina pri vzniku novej súťaže cez API. */
export const ALL_COMPETITION_ROUNDS: CompetitionRound[] = ['nomination', 'ring1', 'ring2', 'bis']

const ROUND_ORDER: CompetitionRound[] = ALL_COMPETITION_ROUNDS

function normalizeRounds(rounds: string[] | null | undefined): CompetitionRound[] {
  const set = new Set<CompetitionRound>()
  for (const round of rounds ?? []) {
    if (round === 'nomination' || round === 'ring1' || round === 'ring2' || round === 'bis') {
      set.add(round)
    }
  }
  // Nominácia je vždy povinná.
  set.add('nomination')
  return ROUND_ORDER.filter((round) => set.has(round))
}

function getEnabledRounds(competition: Competition): CompetitionRound[] {
  return normalizeRounds(competition.roundsEnabled)
}

/** Kanonizuje zoznam kôl (vždy obsahuje nomináciu, platné kolá podľa ROUND_ORDER). */
export function enabledRoundsFromList(rounds: string[] | null | undefined): CompetitionRound[] {
  return normalizeRounds(rounds)
}

/** Zosúladí stav a kolo (mimo `active` = null; v `active` = prvé povolené kolo). */
export function coerceCompetitionState(params: {
  status: CompetitionStatus
  currentRound: CompetitionRound | null
  roundsEnabled: string[] | null | undefined
}): { status: CompetitionStatus; currentRound: CompetitionRound | null } {
  const enabled = normalizeRounds(params.roundsEnabled)
  if (params.status !== 'active') {
    return { status: params.status, currentRound: null }
  }
  const r = params.currentRound
  if (r !== null && enabled.includes(r)) {
    return { status: params.status, currentRound: r }
  }
  return { status: params.status, currentRound: enabled[0] ?? 'nomination' }
}

export function isSetupLocked(competition: Competition): boolean {
  return competition.status === 'active' && competition.currentRound !== null
}

export function canRoundRunNow(
  competition: Competition,
  requestedRound: CompetitionRound
): { ok: true } | { ok: false; message: string } {
  if (competition.status !== 'active') {
    return { ok: false, message: 'Kolo nie je možné spustiť, keď súťaž nie je v stave active.' }
  }

  if (competition.currentRound !== requestedRound) {
    return {
      ok: false,
      message: `Kolo ${requestedRound} nie je aktuálne aktívne pre túto súťaž.`,
    }
  }

  const enabled = getEnabledRounds(competition)
  if (!enabled.includes(requestedRound)) {
    /** Súťaž už reálne beží v `requestedRound` — neblokovať operácie kvôli zúženému / zastaranému `roundsEnabled`. */
    if (competition.currentRound === requestedRound) {
      return { ok: true }
    }
    return { ok: false, message: `Kolo ${requestedRound} nie je povolené v nastaveniach súťaže.` }
  }

  return { ok: true }
}

export function validateCompetitionTransition(
  _current: Competition,
  nextValues: {
    status: CompetitionStatus
    currentRound: CompetitionRound | null
    roundsEnabled: string[] | null | undefined
  }
):
  | { ok: true; normalized: { status: CompetitionStatus; currentRound: CompetitionRound | null } }
  | { ok: false; message: string } {
  const normalized = coerceCompetitionState(nextValues)

  return { ok: true, normalized }
}
