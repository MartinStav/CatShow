import type { HttpContext } from '@adonisjs/core/http'
import Competition from '#models/competition'
import Cat from '#models/cat'
import Evaluation from '#models/evaluation'
import JudgingOrder from '#models/judging_order'
import BisAward from '#models/bis_award'
import CompetitionGrade from '#models/competition_grade'
import CompetitionTitle from '#models/competition_title'
import CompetitionClass from '#models/competition_class'
import { buildRunTimerPayload } from '#utils/competition_run_timer'
import { effectiveProtocolForOrder } from '#utils/judging_order_protocol_round'

type ScoringCatPayload = {
  id: number
  registrationNumber: string
  name: string
  breed: string
  group: string
  status: string
  exhibitor: string | null
  /** 0 = žiadny konkrétny slot (fallback bez protokolu). */
  judgeId: number
}

function formatScoringCatFromSlice(
  c: Cat,
  displayStatus: string,
  judgeId: number
): ScoringCatPayload {
  return {
    id: c.id,
    registrationNumber: c.registrationNumber,
    name: c.name,
    breed: c.breed,
    group: c.group,
    status: displayStatus,
    exhibitor: c.exhibitor?.name || null,
    judgeId,
  }
}

function formatScoringCatLegacy(c: Cat): ScoringCatPayload {
  return formatScoringCatFromSlice(c, c.status, 0)
}

function partitionCatsForTableLegacy(catSubset: Cat[]) {
  const judging = catSubset.filter((c) => c.status === 'judging').map(formatScoringCatLegacy)
  const called = catSubset.filter((c) => c.status === 'called').map(formatScoringCatLegacy)
  const waiting = catSubset.filter((c) => c.status === 'waiting').map(formatScoringCatLegacy)
  const completedCount = catSubset.filter((c) => c.status === 'completed').length
  return { judging, called, waiting, completedCount }
}

function partitionOrderSlices(
  catsById: Map<number, Cat>,
  slices: { catId: number; judgeId: number; status: string }[]
) {
  const judging: ScoringCatPayload[] = []
  const called: ScoringCatPayload[] = []
  const waiting: ScoringCatPayload[] = []
  let completedCount = 0
  for (const s of slices) {
    const c = catsById.get(s.catId)
    if (!c) continue
    const row = formatScoringCatFromSlice(c, s.status, s.judgeId)
    if (s.status === 'judging') judging.push(row)
    else if (s.status === 'called') called.push(row)
    else if (s.status === 'waiting') waiting.push(row)
    else if (s.status === 'completed') completedCount++
  }
  return { judging, called, waiting, completedCount }
}

function slicesForOrdersOnTable(
  rowsOnTable: JudgingOrder[],
  currentRound: Competition['currentRound']
) {
  return rowsOnTable.map((o) => ({
    catId: o.catId,
    judgeId: o.judgeId,
    status: effectiveProtocolForOrder(o, currentRound),
  }))
}

export default class LiveController {
  async scoring({ params, response }: HttpContext) {
    const competition = await Competition.findOrFail(params.id)
    if (!competition.published) {
      return response.notFound({ message: 'Live náhľad nie je publikovaný.' })
    }

    const cats = await Cat.query()
      .where('competitionId', competition.id)
      .preload('exhibitor')
      .preload('evaluations')
      .orderBy('registrationNumber', 'asc')

    const orders = await JudgingOrder.query()
      .where('competitionId', competition.id)
      .preload('judge')
      .orderBy('tableNumber', 'asc')
      .orderBy('orderPosition', 'asc')

    const catsById = new Map(cats.map((c) => [c.id, c]))

    function protocolGroupKey(o: JudgingOrder): string {
      return (o.protocolGroup ?? '').trim()
    }

    function protocolGroupLabel(o: JudgingOrder): string | null {
      const k = protocolGroupKey(o)
      return k.length > 0 ? k : null
    }

    const distinctTableNumbers = [...new Set(orders.map((o) => o.tableNumber))].sort(
      (a, b) => a - b
    )
    const hasProtocolTables = distinctTableNumbers.length > 0

    type TableBlock = {
      key: string
      tableNumber: number | null
      label: string | null
      protocolGroup: string | null
      judgeName: string | null
      judging: ScoringCatPayload[]
      called: ScoringCatPayload[]
      waiting: ScoringCatPayload[]
      completedCount: number
    }

    const emptyPartition = {
      judging: [] as ScoringCatPayload[],
      called: [] as ScoringCatPayload[],
      waiting: [] as ScoringCatPayload[],
      completedCount: 0,
    }

    const tables: TableBlock[] = []

    if (!hasProtocolTables) {
      const p = partitionCatsForTableLegacy(cats)
      tables.push({
        key: 'legacy',
        tableNumber: 1,
        label: null,
        protocolGroup: null,
        judgeName: null,
        ...p,
      })
    } else {
      for (const tn of distinctTableNumbers) {
        const rowsOnTable = orders.filter((o) => o.tableNumber === tn)
        const slices = slicesForOrdersOnTable(rowsOnTable, competition.currentRound)
        const enriched = rowsOnTable.map((o, i) => ({
          order: o,
          status: slices[i]!.status,
          judgeId: o.judgeId,
        }))

        let activeJudgeId: number | null = null
        for (const status of ['judging', 'called'] as const) {
          const hit = enriched.find((e) => e.status === status)
          if (hit) {
            activeJudgeId = hit.judgeId
            break
          }
        }
        if (activeJudgeId === null) {
          const next = enriched.find((e) => e.status !== 'completed')
          if (next) activeJudgeId = next.judgeId
        }
        if (activeJudgeId === null && enriched.length > 0) {
          activeJudgeId = enriched[0]!.judgeId
        }

        const judgeQueue = enriched.filter((e) => e.judgeId === activeJudgeId)
        const firstOpen = judgeQueue.find((e) => e.status !== 'completed')

        let p: ReturnType<typeof partitionOrderSlices>
        let protocolGroup: string | null = null
        let judgeName: string | null = null

        if (firstOpen === undefined) {
          p = emptyPartition
          if (activeJudgeId !== null) {
            const row = rowsOnTable.find((o) => o.judgeId === activeJudgeId)
            judgeName = row?.judge?.name ?? null
          }
        } else {
          const gKey = protocolGroupKey(firstOpen.order)
          const visible = judgeQueue.filter((e) => protocolGroupKey(e.order) === gKey)
          const visibleSlices = visible.map((e) => ({
            catId: e.order.catId,
            judgeId: e.order.judgeId,
            status: e.status,
          }))
          p = partitionOrderSlices(catsById, visibleSlices)
          protocolGroup = protocolGroupLabel(firstOpen.order)
          judgeName = firstOpen.order.judge?.name ?? null
        }

        tables.push({
          key: `table-${tn}`,
          tableNumber: tn,
          label: `Stôl ${tn}`,
          protocolGroup,
          judgeName,
          ...p,
        })
      }
      const assignedCatIds = new Set(orders.map((o) => o.catId))
      const unassigned = cats.filter((c) => !assignedCatIds.has(c.id))
      if (unassigned.length > 0) {
        const p = partitionCatsForTableLegacy(unassigned)
        tables.push({
          key: 'unassigned',
          tableNumber: null,
          label: 'Nepriradené',
          protocolGroup: null,
          judgeName: null,
          ...p,
        })
      }
    }

    const activeCats: ScoringCatPayload[] = hasProtocolTables
      ? orders
          .filter((o) => {
            const s = effectiveProtocolForOrder(o, competition.currentRound)
            return s === 'judging' || s === 'called'
          })
          .map((o) => {
            const c = catsById.get(o.catId)
            return c
              ? formatScoringCatFromSlice(
                  c,
                  effectiveProtocolForOrder(o, competition.currentRound),
                  o.judgeId
                )
              : null
          })
          .filter((x): x is ScoringCatPayload => x !== null)
      : cats
          .filter((c) => c.status === 'judging' || c.status === 'called')
          .map(formatScoringCatLegacy)

    const totalCats = hasProtocolTables ? orders.length : cats.length
    const completedCats = hasProtocolTables
      ? orders.filter((o) => effectiveProtocolForOrder(o, competition.currentRound) === 'completed')
          .length
      : cats.filter((c) => c.status === 'completed').length

    return response.ok({
      competition: {
        id: competition.id,
        name: competition.name,
        status: competition.status,
        currentRound: competition.currentRound,
      },
      runTimer: buildRunTimerPayload(competition),
      tables,
      activeCats,
      totalCats,
      completedCats,
    })
  }

  async results({ params, request, response }: HttpContext) {
    const competition = await Competition.findOrFail(params.id)
    if (!competition.published) {
      return response.notFound({ message: 'Live výsledky nie sú publikované.' })
    }

    const round = request.input('round')
    const group = request.input('group')

    const query = Evaluation.query()
      .where('competitionId', competition.id)
      .preload('cat')
      .preload('judge')

    if (round) query.where('round', round)
    if (group) {
      query.whereHas('cat', (q) => q.where('group', group))
    }

    const evaluations = await query.orderBy('position', 'asc')

    return response.ok(
      evaluations.map((e) => ({
        id: e.id,
        cat: {
          id: e.cat.id,
          registrationNumber: e.cat.registrationNumber,
          name: e.cat.name,
          breed: e.cat.breed,
          group: e.cat.group,
        },
        judge: e.judge ? { id: e.judge.id, name: e.judge.name } : null,
        round: e.round,
        grade: e.grade,
        titles: e.titles,
        position: e.position,
        accepted: e.accepted,
        nomBis: e.nomBis,
      }))
    )
  }

  /** Kompletné výsledky súťaže pre verejnú stránku (sumár, hodnotenia, BIS, taxonómia). */
  async fullResults({ params, response }: HttpContext) {
    const competition = await Competition.findOrFail(params.id)
    if (!competition.published) {
      return response.notFound({ message: 'Výsledky nie sú publikované.' })
    }

    const [evaluations, bisAwards, cats, grades, titles, classes] = await Promise.all([
      Evaluation.query()
        .where('competitionId', competition.id)
        .preload('cat', (q) => q.preload('exhibitor'))
        .preload('judge'),
      BisAward.query()
        .where('competitionId', competition.id)
        .preload('cat', (q) => q.preload('exhibitor'))
        .preload('judge')
        .orderBy('level', 'asc')
        .orderBy('position', 'asc'),
      Cat.query().where('competitionId', competition.id).preload('exhibitor'),
      CompetitionGrade.query().where('competitionId', competition.id).orderBy('sortOrder', 'asc'),
      CompetitionTitle.query().where('competitionId', competition.id).orderBy('sortOrder', 'asc'),
      CompetitionClass.query().where('competitionId', competition.id).orderBy('sortOrder', 'asc'),
    ])

    const evaluatedCatIds = new Set(evaluations.map((e) => e.catId))

    const evalRows = evaluations.map((e) => ({
      id: e.id,
      cat: {
        id: e.cat.id,
        registrationNumber: e.cat.registrationNumber,
        name: e.cat.name,
        breed: e.cat.breed,
        group: e.cat.group,
        groups: e.cat.groups ?? [],
        class: e.cat.catClass,
        sex: e.cat.sex,
        exhibitor: e.cat.exhibitor?.name ?? null,
      },
      judge: e.judge ? { id: e.judge.id, name: e.judge.name } : null,
      round: e.round,
      grade: e.grade,
      titles: e.titles,
      position: e.position,
      accepted: e.accepted,
      nomBis: e.nomBis,
    }))

    const bisRows = bisAwards.map((a) => ({
      id: a.id,
      level: a.level,
      catId: a.catId,
      cat: {
        id: a.cat.id,
        registrationNumber: a.cat.registrationNumber,
        name: a.cat.name,
        breed: a.cat.breed,
        group: a.cat.group,
        groups: a.cat.groups ?? [],
        class: a.cat.catClass,
        sex: a.cat.sex,
        exhibitor: a.cat.exhibitor?.name ?? null,
      },
      judge: a.judge ? { id: a.judge.id, name: a.judge.name } : null,
      category: a.category,
      sex: a.sex,
      classCode: a.classCode,
      position: a.position,
      notes: a.notes,
    }))

    return response.ok({
      competition: {
        id: competition.id,
        name: competition.name,
        date: competition.date,
        location: competition.location,
        description: competition.description,
        status: competition.status,
        published: competition.published,
        currentRound: competition.currentRound,
        roundsEnabled: competition.roundsEnabled ?? [],
      },
      summary: {
        totalCats: cats.length,
        ratedCats: cats.filter((c) => evaluatedCatIds.has(c.id)).length,
        bisCount: bisAwards.filter((a) => a.level === 'BIS').length,
        bivCount: bisAwards.filter((a) => a.level === 'BIV').length,
        nomBisCount: bisAwards.filter((a) => a.level === 'NOM_BIS').length,
      },
      taxonomy: {
        grades: grades.map((g) => ({
          id: g.id,
          code: g.code,
          name: g.name,
          countsAsAccepted: g.countsAsAccepted,
          eligibleForNomBis: g.eligibleForNomBis,
          sortOrder: g.sortOrder,
        })),
        titles: titles.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description,
          classCodes: t.classCodes ?? [],
          sortOrder: t.sortOrder,
        })),
        classes: classes.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description,
          sortOrder: c.sortOrder,
        })),
      },
      evaluations: evalRows,
      bisAwards: bisRows,
    })
  }

  async monitoringRing({ params, response }: HttpContext) {
    const competition = await Competition.findOrFail(params.id)
    if (!competition.published) {
      return response.notFound({ message: 'Live monitoring nie je publikovaný.' })
    }

    if (competition.currentRound !== 'ring1' && competition.currentRound !== 'ring2') {
      return response.ok({
        competition: {
          id: competition.id,
          name: competition.name,
          status: competition.status,
          currentRound: competition.currentRound,
        },
        runTimer: buildRunTimerPayload(competition),
        called: [],
        judging: [],
        nextUp: [],
        lastCompleted: null,
      })
    }

    const ordersWithCats = await JudgingOrder.query()
      .where('competitionId', competition.id)
      .preload('cat', (q) => q.preload('exhibitor'))
      .orderBy('tableNumber', 'asc')
      .orderBy('protocolGroup', 'asc')
      .orderBy('orderPosition', 'asc')

    if (ordersWithCats.length > 0) {
      const mk = (o: (typeof ordersWithCats)[0]) => formatCatForDisplay(o.cat, o.judgeId)
      const rnd = competition.currentRound
      const called = ordersWithCats
        .filter((o) => effectiveProtocolForOrder(o, rnd) === 'called')
        .map(mk)
      const judging = ordersWithCats
        .filter((o) => effectiveProtocolForOrder(o, rnd) === 'judging')
        .map(mk)
      const nextUp = ordersWithCats
        .filter((o) => effectiveProtocolForOrder(o, rnd) === 'waiting')
        .map(mk)

      const lastQ = JudgingOrder.query()
        .where('competitionId', competition.id)
        .orderBy('updatedAt', 'desc')
      if (competition.currentRound === 'ring1') {
        lastQ.where('ring1ProtocolCallStatus', 'completed')
      } else {
        lastQ.where('ring2ProtocolCallStatus', 'completed')
      }
      const lastOrd = await lastQ.preload('cat', (q) => q.preload('exhibitor')).first()

      return response.ok({
        competition: {
          id: competition.id,
          name: competition.name,
          status: competition.status,
          currentRound: competition.currentRound,
        },
        runTimer: buildRunTimerPayload(competition),
        called,
        judging,
        nextUp,
        lastCompleted: lastOrd?.cat ? formatCatForDisplay(lastOrd.cat, lastOrd.judgeId) : null,
      })
    }

    const cats = await Cat.query()
      .where('competitionId', competition.id)
      .whereIn('status', ['called', 'judging', 'waiting'])
      .preload('exhibitor')
      .orderBy('registrationNumber', 'asc')

    const called = cats.filter((c) => c.status === 'called')
    const judging = cats.filter((c) => c.status === 'judging')
    const nextUp = cats.filter((c) => c.status === 'waiting')
    const lastCompleted = await Cat.query()
      .where('competitionId', competition.id)
      .where('status', 'completed')
      .preload('exhibitor')
      .orderBy('updatedAt', 'desc')
      .first()

    return response.ok({
      competition: {
        id: competition.id,
        name: competition.name,
        status: competition.status,
        currentRound: competition.currentRound,
      },
      runTimer: buildRunTimerPayload(competition),
      called: called.map((c) => formatCatForDisplay(c)),
      judging: judging.map((c) => formatCatForDisplay(c)),
      nextUp: nextUp.map((c) => formatCatForDisplay(c)),
      lastCompleted: lastCompleted ? formatCatForDisplay(lastCompleted) : null,
    })
  }
}

function formatCatForDisplay(c: Cat, judgeId?: number) {
  return {
    id: c.id,
    registrationNumber: c.registrationNumber,
    name: c.name,
    breed: c.breed,
    group: c.group,
    exhibitor: c.exhibitor?.name || null,
    judgeId: judgeId ?? 0,
  }
}
