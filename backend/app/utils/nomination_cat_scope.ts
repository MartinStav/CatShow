import JudgingOrder from '#models/judging_order'

export type NominationCatScope = { kind: 'all' } | { kind: 'assigned'; catIds: number[] }

/** Vráti rozsah mačiek pre nomináciu — podľa judging_order alebo všetky. */
export async function getNominationCatScope(
  competitionId: number,
  judgeId: number
): Promise<NominationCatScope> {
  const countRow = await JudgingOrder.query()
    .where('competitionId', competitionId)
    .count('* as total')
  const totalOrders = Number(countRow[0].$extras.total)
  if (totalOrders === 0) {
    return { kind: 'all' }
  }
  const orders = await JudgingOrder.query()
    .where('competitionId', competitionId)
    .where('judgeId', judgeId)
  const catIds = [...new Set(orders.map((o) => o.catId))]
  return { kind: 'assigned', catIds }
}

export async function assertNominationEvaluationAllowed(
  competitionId: number,
  judgeId: number,
  catId: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const scope = await getNominationCatScope(competitionId, judgeId)
  if (scope.kind === 'all') {
    return { ok: true }
  }
  if (scope.catIds.includes(catId)) {
    return { ok: true }
  }
  return {
    ok: false,
    message: 'Táto mačka nie je v poradí posudzovania priradená tomuto rozhodcovi.',
  }
}
