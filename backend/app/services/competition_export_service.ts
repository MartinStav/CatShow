import BisAward from '#models/bis_award'
import Cat from '#models/cat'
import type Competition from '#models/competition'
import CompetitionClass from '#models/competition_class'
import CompetitionGrade from '#models/competition_grade'
import CompetitionTitle from '#models/competition_title'
import Evaluation from '#models/evaluation'
import Exhibitor from '#models/exhibitor'
import Judge from '#models/judge'
import JudgingOrder from '#models/judging_order'
import type User from '#models/user'
import { normalizeEmail, normalizePhone } from '#utils/resolve_user_id_from_import'

export type ExportMode = 'full' | 'structure' | string

type ExportUserRow = {
  fullName: string
  email: string | null
  phone: string | null
  role: string
}

function collectUsersForExport(judges: Judge[], exhibitors: Exhibitor[]): ExportUserRow[] {
  const map = new Map<string, ExportUserRow>()
  const add = (u: User | undefined) => {
    if (!u) return
    const key = `${u.email ?? ''}|${u.phone ?? ''}|${u.id}`
    if (map.has(key)) return
    map.set(key, {
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
    })
  }
  for (const j of judges) {
    add(j.user)
    add(j.stewardUser)
  }
  for (const e of exhibitors) add(e.user)
  return [...map.values()]
}

/** Postaví JSON snapshot súťaže — `structure` / `full` / default (full s resetnutými stavmi mačiek). */
export async function buildCompetitionExport(
  competition: Competition,
  mode: ExportMode
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {
    competition: {
      name: competition.name,
      date: competition.date,
      description: competition.description,
      location: competition.location,
      status: competition.status,
      published: competition.published,
      currentRound: competition.currentRound,
      roundsEnabled: competition.roundsEnabled ?? [],
    },
  }

  const [grades, titles, classes] = await Promise.all([
    CompetitionGrade.query().where('competitionId', competition.id).orderBy('sortOrder', 'asc'),
    CompetitionTitle.query().where('competitionId', competition.id).orderBy('sortOrder', 'asc'),
    CompetitionClass.query().where('competitionId', competition.id).orderBy('sortOrder', 'asc'),
  ])
  result.grades = grades.map((g) => ({
    code: g.code,
    name: g.name,
    countsAsAccepted: g.countsAsAccepted,
    eligibleForNomBis: g.eligibleForNomBis,
    sortOrder: g.sortOrder,
  }))
  result.titles = titles.map((t) => ({
    code: t.code,
    name: t.name,
    description: t.description,
    classCodes: t.classCodes,
    sortOrder: t.sortOrder,
  }))
  result.classes = classes.map((c) => ({
    code: c.code,
    name: c.name,
    description: c.description,
    minAgeMonths: c.minAgeMonths,
    maxAgeMonths: c.maxAgeMonths,
    isNeuter: c.isNeuter,
    isKittenOrJunior: c.isKittenOrJunior,
    isSeparateBisCategory: c.isSeparateBisCategory,
    sortOrder: c.sortOrder,
  }))

  const judges = await Judge.query()
    .where('competitionId', competition.id)
    .preload('user')
    .preload('stewardUser')
  result.judges = judges.map((j) => {
    const email = j.user?.email ?? null
    const phone = j.user?.phone ?? null
    const row: Record<string, string> = {}
    if (email) row.email = email
    if (phone) row.phone = phone
    if (Object.keys(row).length === 0) row.name = j.name
    const stewardEmail = j.stewardUser?.email ?? null
    const stewardPhone = j.stewardUser?.phone ?? null
    if (stewardEmail) row.stewardEmail = stewardEmail
    if (stewardPhone) row.stewardPhone = stewardPhone
    return row
  })

  if (mode === 'structure') {
    result.users = collectUsersForExport(judges, [])
    return result
  }

  const exhibitors = await Exhibitor.query().where('competitionId', competition.id).preload('user')
  const cats = await Cat.query()
    .where('competitionId', competition.id)
    .preload('exhibitor')
    .orderBy('registrationNumber', 'asc')

  result.exhibitors = exhibitors.map((e) => {
    const row: Record<string, string> = {}
    if (e.email) row.email = e.email
    if (e.phone) row.phone = e.phone
    if (Object.keys(row).length === 0) row.name = e.name
    return row
  })

  result.users = collectUsersForExport(judges, exhibitors)

  result.cats = cats.map((c) => {
    const row: Record<string, unknown> = {
      registrationNumber: c.registrationNumber,
      name: c.name,
      breed: c.breed,
      class: c.catClass,
      sex: c.sex,
      age: c.age,
      status: mode === 'full' ? c.status : 'waiting',
    }
    const em = normalizeEmail(c.exhibitor?.email ?? null)
    if (em) row.exhibitorEmail = em
    const ph = normalizePhone(c.exhibitor?.phone ?? null)
    if (ph) row.exhibitorPhone = ph
    return row
  })

  if (mode === 'full') {
    const evaluations = await Evaluation.query()
      .where('competitionId', competition.id)
      .preload('judge', (q) => q.preload('user'))
      .preload('cat')

    result.evaluations = evaluations.map((e) => {
      const row: Record<string, unknown> = {
        catNumber: e.cat?.registrationNumber ?? null,
        catId: e.catId,
        round: e.round,
        grade: e.grade,
        titles: e.titles,
        position: e.position,
        accepted: e.accepted,
        nomBis: e.nomBis,
      }
      const em = normalizeEmail(e.judge?.user?.email ?? null)
      if (em) row.judgeEmail = em
      const ph = normalizePhone(e.judge?.user?.phone ?? null)
      if (ph) row.judgePhone = ph
      return row
    })

    const bisAwards = await BisAward.query()
      .where('competitionId', competition.id)
      .preload('cat')
      .preload('judge', (q) => q.preload('user'))
      .orderBy('level', 'asc')
      .orderBy('position', 'asc')
    result.bisAwards = bisAwards.map((a) => {
      const row: Record<string, unknown> = {
        catNumber: a.cat?.registrationNumber ?? null,
        catId: a.catId,
        level: a.level,
        category: a.category,
        sex: a.sex,
        classCode: a.classCode,
        position: a.position,
        notes: a.notes,
      }
      const em = normalizeEmail(a.judge?.user?.email ?? null)
      if (em) row.judgeEmail = em
      const ph = normalizePhone(a.judge?.user?.phone ?? null)
      if (ph) row.judgePhone = ph
      return row
    })
  }

  const judgingOrders = await JudgingOrder.query()
    .where('competitionId', competition.id)
    .preload('judge', (q) => q.preload('user'))
    .preload('cat')
    .orderBy('tableNumber', 'asc')
    .orderBy('protocolGroup', 'asc')
    .orderBy('orderPosition', 'asc')

  result.judgingOrders = judgingOrders.map((o) => {
    const row: Record<string, unknown> = {
      catNumber: o.cat?.registrationNumber || null,
      orderPosition: o.orderPosition,
      tableNumber: o.tableNumber,
      protocolCallStatus: o.protocolCallStatus,
      ring1ProtocolCallStatus: o.ring1ProtocolCallStatus,
      ring2ProtocolCallStatus: o.ring2ProtocolCallStatus,
    }
    if (o.protocolGroup?.trim()) {
      row.protocolGroup = o.protocolGroup.trim()
    }
    const em = normalizeEmail(o.judge?.user?.email ?? null)
    if (em) row.judgeEmail = em
    const ph = normalizePhone(o.judge?.user?.phone ?? null)
    if (ph) row.judgePhone = ph
    return row
  })

  return result
}
