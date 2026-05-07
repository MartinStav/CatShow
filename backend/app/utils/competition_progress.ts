import Cat from '#models/cat'
import CompetitionGrade from '#models/competition_grade'
import CompetitionRole from '#models/competition_role'
import Evaluation from '#models/evaluation'
import NominationPhaseCompletion from '#models/nomination_phase_completion'
import Ring2RankingCompletion from '#models/ring2_ranking_completion'
import { getNominationCatScope } from '#utils/nomination_cat_scope'

/** Súťaž môže ukončiť superadmin, admin alebo administrátor súťaže. */
export async function userCanFinishCompetition(
  user: { id: number; role: string },
  competitionId: number
): Promise<boolean> {
  if (user.role === 'superadmin' || user.role === 'admin') return true
  const row = await CompetitionRole.query()
    .where('competitionId', competitionId)
    .where('userId', user.id)
    .where('role', 'administrator')
    .first()
  return !!row
}

/** Skontroluje, či má sudca ohodnotené všetky „svoje" mačky (podľa poradia). */
export async function judgeNominationIncompleteMessage(
  competitionId: number,
  judgeId: number
): Promise<string | null> {
  const scope = await getNominationCatScope(competitionId, judgeId)
  let expectedCatIds: number[]
  if (scope.kind === 'all') {
    const cats = await Cat.query().where('competitionId', competitionId).select('id')
    expectedCatIds = cats.map((c) => c.id)
  } else {
    expectedCatIds = scope.catIds
  }

  if (scope.kind === 'assigned' && expectedCatIds.length === 0) {
    return null
  }

  const evals = await Evaluation.query()
    .where('competitionId', competitionId)
    .where('round', 'nomination')
    .where('judgeId', judgeId)

  const expectedSet = new Set(expectedCatIds)
  const relevantEvals = scope.kind === 'all' ? evals : evals.filter((e) => expectedSet.has(e.catId))

  const catIds = new Set(relevantEvals.map((e) => e.catId))
  for (const id of expectedCatIds) {
    if (!catIds.has(id)) {
      return 'Nie sú ohodnotené všetky mačky.'
    }
  }

  return null
}

/** Predvolené „accepted" kódy v Ring1, ak nie sú nakonfigurované v taxonómii. */
const DEFAULT_ACCEPTED_GRADE_CODES = ['EX1', 'EX2', 'EX3'] as const

async function loadAcceptedGradeCodes(competitionId: number): Promise<Set<string>> {
  const grades = await CompetitionGrade.query().where('competitionId', competitionId)
  const acceptedCodes = new Set(
    grades
      .filter((g) => g.countsAsAccepted)
      .map((g) => g.code.trim())
      .filter((c) => c.length > 0)
  )
  if (acceptedCodes.size === 0) {
    for (const code of DEFAULT_ACCEPTED_GRADE_CODES) acceptedCodes.add(code)
  }
  return acceptedCodes
}

/** Ring 1: všetky „prijateľné" mačky z nominácie musia mať accepted true/false. */
export async function judgeRing1IncompleteMessage(
  competitionId: number,
  judgeId: number
): Promise<string | null> {
  const acceptedCodes = await loadAcceptedGradeCodes(competitionId)

  const nominationEvals = await Evaluation.query()
    .where('competitionId', competitionId)
    .where('round', 'nomination')
    .where('judgeId', judgeId)

  const eligibleCatIds = new Set<number>()
  for (const ev of nominationEvals) {
    const g = ev.grade?.trim()
    if (!g || !acceptedCodes.has(g)) continue
    eligibleCatIds.add(ev.catId)
  }

  if (eligibleCatIds.size === 0) {
    return null
  }

  const ring1Evals = await Evaluation.query()
    .where('competitionId', competitionId)
    .where('round', 'ring1')
    .where('judgeId', judgeId)
    .whereIn('catId', [...eligibleCatIds])

  const decided = new Set(
    ring1Evals.filter((e) => e.accepted === true || e.accepted === false).map((e) => e.catId)
  )
  for (const catId of eligibleCatIds) {
    if (!decided.has(catId)) {
      return 'Nie sú rozhodnuté všetky mačky pre ring 1.'
    }
  }

  return null
}

/** Ring2: všetky prijaté mačky z ring1 musia mať jednoznačné poradie. */
export async function judgeRing2IncompleteMessage(
  competitionId: number,
  judgeId: number
): Promise<string | null> {
  const ring1Evals = await Evaluation.query()
    .where('competitionId', competitionId)
    .where('round', 'ring1')
    .where('judgeId', judgeId)

  const acceptedCatIds = ring1Evals.filter((e) => e.accepted === true).map((e) => e.catId)
  if (acceptedCatIds.length === 0) {
    return 'Pre ring 2 nemáte žiadne prijaté mačky z ringu 1.'
  }

  const ring2Evals = await Evaluation.query()
    .where('competitionId', competitionId)
    .where('round', 'ring2')
    .where('judgeId', judgeId)
    .whereIn('catId', acceptedCatIds)

  const byCat = new Map(ring2Evals.map((e) => [e.catId, e]))
  for (const id of acceptedCatIds) {
    const ev = byCat.get(id)
    if (!ev || ev.position === null || ev.position === undefined) {
      return 'Nie sú priradené pozície pre všetky mačky.'
    }
  }

  const positions = acceptedCatIds.map((id) => byCat.get(id)!.position as number)
  const uniq = new Set(positions)
  if (uniq.size !== positions.length) {
    return 'Každá mačka musí mať inú pozíciu.'
  }
  return null
}

/** Percentuálny progress aktuálneho kola podľa počtu hotových sudcov. */
export async function computeCurrentRoundJudgeProgress(params: {
  competitionId: number
  currentRound: string | null
  judges: Array<{ id: number; userId: number | null }>
}): Promise<number> {
  const judgesWithUser = params.judges.filter((j) => j.userId !== null)
  if (judgesWithUser.length === 0) return 0

  const competitionCats = await Cat.query()
    .where('competitionId', params.competitionId)
    .select('id')
  const allCatIds = competitionCats.map((c) => c.id)
  if (allCatIds.length === 0) return 0

  if (params.currentRound === 'nomination') {
    const assignedJudgeIds: number[] = []
    for (const j of judgesWithUser) {
      const scope = await getNominationCatScope(params.competitionId, j.id)
      if (scope.kind === 'all' ? allCatIds.length > 0 : scope.catIds.length > 0) {
        assignedJudgeIds.push(j.id)
      }
    }
    if (assignedJudgeIds.length === 0) return 0
    const doneRows = await NominationPhaseCompletion.query()
      .where('competitionId', params.competitionId)
      .whereIn('judgeId', assignedJudgeIds)
      .select('judgeId')
    const doneIds = new Set(doneRows.map((r) => r.judgeId))
    return Math.round((doneIds.size / assignedJudgeIds.length) * 100)
  }

  if (params.currentRound === 'ring1') {
    const acceptedCodes = await loadAcceptedGradeCodes(params.competitionId)

    const nominationEvals = await Evaluation.query()
      .where('competitionId', params.competitionId)
      .where('round', 'nomination')
    const eligibleByJudge = new Map<number, Set<number>>()
    for (const ev of nominationEvals) {
      if (ev.judgeId === null || !ev.grade) continue
      if (!acceptedCodes.has(ev.grade.trim())) continue
      const set = eligibleByJudge.get(ev.judgeId) ?? new Set<number>()
      set.add(ev.catId)
      eligibleByJudge.set(ev.judgeId, set)
    }

    const assignedJudgeIds = judgesWithUser
      .map((j) => j.id)
      .filter((judgeId) => (eligibleByJudge.get(judgeId)?.size ?? 0) > 0)
    if (assignedJudgeIds.length === 0) return 0

    const ring1Evals = await Evaluation.query()
      .where('competitionId', params.competitionId)
      .where('round', 'ring1')
      .whereIn('judgeId', assignedJudgeIds)
    const decidedByJudge = new Map<number, Set<number>>()
    for (const ev of ring1Evals) {
      if (ev.judgeId === null || ev.accepted === null || ev.accepted === undefined) continue
      const set = decidedByJudge.get(ev.judgeId) ?? new Set<number>()
      set.add(ev.catId)
      decidedByJudge.set(ev.judgeId, set)
    }

    let done = 0
    for (const judgeId of assignedJudgeIds) {
      const eligible = eligibleByJudge.get(judgeId) ?? new Set<number>()
      const decided = decidedByJudge.get(judgeId) ?? new Set<number>()
      const complete = [...eligible].every((catId) => decided.has(catId))
      if (complete) done++
    }
    return Math.round((done / assignedJudgeIds.length) * 100)
  }

  if (params.currentRound === 'ring2' || params.currentRound === 'bis') {
    const ring1Evals = await Evaluation.query()
      .where('competitionId', params.competitionId)
      .where('round', 'ring1')
      .where('accepted', true)
    const assignedByJudge = new Map<number, number>()
    for (const ev of ring1Evals) {
      if (ev.judgeId === null) continue
      assignedByJudge.set(ev.judgeId, (assignedByJudge.get(ev.judgeId) ?? 0) + 1)
    }
    const assignedJudgeIds = judgesWithUser
      .map((j) => j.id)
      .filter((judgeId) => (assignedByJudge.get(judgeId) ?? 0) > 0)
    if (assignedJudgeIds.length === 0) return 0
    const doneRows = await Ring2RankingCompletion.query()
      .where('competitionId', params.competitionId)
      .whereIn('judgeId', assignedJudgeIds)
      .select('judgeId')
    const doneIds = new Set(doneRows.map((r) => r.judgeId))
    return Math.round((doneIds.size / assignedJudgeIds.length) * 100)
  }

  return 0
}
