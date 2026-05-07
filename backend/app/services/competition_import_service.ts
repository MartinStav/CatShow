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
import User from '#models/user'
import {
  coerceCompetitionState,
  enabledRoundsFromList,
  type CompetitionRound,
  type CompetitionStatus,
} from '#utils/competition_flow'
import { ensureStewardCompetitionRole } from '#utils/ensure_steward_competition_role'
import {
  findExistingUserForImport,
  normalizeEmail,
  normalizePhone,
  resolveUserIdForImport,
} from '#utils/resolve_user_id_from_import'
import { createUserValidator } from '#validators/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

function resolveImportedCatExhibitorId(
  c: Record<string, unknown>,
  byEmail: Map<string, number>,
  byPhone: Map<string, number>
): number | null {
  const em = normalizeEmail(c.exhibitorEmail)
  if (em) {
    const id = byEmail.get(em)
    if (id !== undefined) return id
  }
  const ph = normalizePhone(c.exhibitorPhone)
  if (ph) {
    const id = byPhone.get(ph)
    if (id !== undefined) return id
  }
  return null
}

function buildJudgeIdMapsByContact(
  judges: { id: number; user?: { email: string | null; phone: string | null } | null }[]
): { byEmail: Map<string, number>; byPhone: Map<string, number> } {
  const byEmail = new Map<string, number>()
  const byPhone = new Map<string, number>()
  for (const j of judges) {
    const u = j.user
    if (!u) continue
    const em = normalizeEmail(u.email)
    if (em) byEmail.set(em, j.id)
    const ph = normalizePhone(u.phone)
    if (ph) byPhone.set(ph, j.id)
  }
  return { byEmail, byPhone }
}

function resolveImportedJudgeId(
  row: Record<string, unknown>,
  byEmail: Map<string, number>,
  byPhone: Map<string, number>
): number | null {
  const em = normalizeEmail(row.judgeEmail)
  if (em) {
    const id = byEmail.get(em)
    if (id !== undefined) return id
  }
  const ph = normalizePhone(row.judgePhone)
  if (ph) {
    const id = byPhone.get(ph)
    if (id !== undefined) return id
  }
  return null
}

async function createUsersFromImportJson(
  rows: unknown,
  currentUser: User,
  trx: TransactionClientContract
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return

  for (const [i, raw] of rows.entries()) {
    const label = `Používateľ v importe #${i + 1}`
    const [valError, data] = await createUserValidator.tryValidate(raw as Record<string, unknown>)
    if (valError || !data) {
      const firstMsg =
        Array.isArray(valError?.messages) &&
        valError.messages[0] &&
        typeof valError.messages[0] === 'object'
          ? (valError.messages[0] as { message?: string }).message
          : undefined
      if (firstMsg) {
        throw new Error(`${label}: ${firstMsg}`)
      }
      throw new Error(
        `${label}: neplatné údaje – potrebné je celé meno (fullName), heslo (8–64 znakov, aspoň jedno písmeno a jedno číslo) a aspoň e-mail alebo telefón.`
      )
    }

    const email = data.email?.trim().toLowerCase() || null
    const phone = data.phone?.trim().replace(/\s+/g, '') || null
    if (!email && !phone) {
      throw new Error(`${label}: zadajte aspoň e-mail alebo telefón.`)
    }

    if (currentUser.role === 'admin' && (data.role === 'admin' || data.role === 'superadmin')) {
      throw new Error(
        `${label}: rolu admin alebo superadmin môže v importe nastaviť iba superadmin.`
      )
    }

    let newRole: User['role']
    if (currentUser.role === 'superadmin') {
      newRole = data.role ?? 'user'
    } else {
      newRole = data.role === 'demo' ? 'demo' : 'user'
    }

    const alreadyThere = await findExistingUserForImport(email, phone, trx)
    if (alreadyThere) {
      alreadyThere.useTransaction(trx)
      alreadyThere.fullName = data.fullName
      alreadyThere.password = data.password
      alreadyThere.mustChangePassword = true
      await alreadyThere.save()
      continue
    }

    await User.create(
      {
        fullName: data.fullName,
        email,
        phone,
        password: data.password,
        role: newRole,
        createdById: currentUser.id,
        mustChangePassword: true,
      },
      { client: trx }
    )
  }
}

type ImportPayload = Record<string, unknown> & {
  competition?: Record<string, unknown>
  grades?: Array<Record<string, unknown>>
  titles?: Array<Record<string, unknown>>
  classes?: Array<Record<string, unknown>>
  judges?: Array<Record<string, unknown>>
  exhibitors?: Array<Record<string, unknown>>
  cats?: Array<Record<string, unknown>>
  evaluations?: Array<Record<string, unknown>>
  bisAwards?: Array<Record<string, unknown>>
  judgingOrders?: Array<Record<string, unknown>>
  users?: unknown
}

/** Aplikuje import payload na súťaž v rámci transakcie; pri chybe vyhodí Error so slovenskou správou. */
export async function applyCompetitionImport(args: {
  competition: Competition
  payload: ImportPayload
  currentUser: User
  trx: TransactionClientContract
}): Promise<void> {
  const { competition, payload: data, currentUser, trx } = args

  await createUsersFromImportJson(data.users, currentUser, trx)

  if (data.competition) {
    competition.useTransaction(trx)
    const imported = data.competition
    competition.merge({
      name: (imported.name as string | undefined) ?? competition.name,
      date: (imported.date as string | undefined) ?? competition.date,
      description: (imported.description as string | null | undefined) ?? competition.description,
      location: (imported.location as string | null | undefined) ?? competition.location,
      status: (imported.status as CompetitionStatus | undefined) ?? competition.status,
      published: (imported.published as boolean | undefined) ?? competition.published,
      currentRound:
        (imported.currentRound as CompetitionRound | null | undefined) ?? competition.currentRound,
    })
    if (Array.isArray(imported.roundsEnabled)) {
      competition.roundsEnabled = enabledRoundsFromList(imported.roundsEnabled as string[])
    }
    const coerced = coerceCompetitionState({
      status: competition.status as CompetitionStatus,
      currentRound: competition.currentRound as CompetitionRound | null,
      roundsEnabled: competition.roundsEnabled,
    })
    competition.status = coerced.status
    competition.currentRound = coerced.currentRound
    await competition.save()
  }

  if (Array.isArray(data.grades)) {
    await CompetitionGrade.query({ client: trx }).where('competitionId', competition.id).delete()
    for (const [i, grade] of data.grades.entries()) {
      await CompetitionGrade.create(
        {
          competitionId: competition.id,
          code: String(grade.code ?? '').trim(),
          name: (grade.name as string | undefined) ?? null,
          countsAsAccepted: Boolean(grade.countsAsAccepted),
          eligibleForNomBis: Boolean(grade.eligibleForNomBis),
          sortOrder: Number(grade.sortOrder ?? i),
        },
        { client: trx }
      )
    }
  }

  if (Array.isArray(data.titles)) {
    await CompetitionTitle.query({ client: trx }).where('competitionId', competition.id).delete()
    for (const [i, title] of data.titles.entries()) {
      await CompetitionTitle.create(
        {
          competitionId: competition.id,
          code: String(title.code ?? '').trim(),
          name: (title.name as string | undefined) ?? null,
          description: (title.description as string | undefined) ?? null,
          classCodes: Array.isArray(title.classCodes) ? (title.classCodes as string[]) : [],
          sortOrder: Number(title.sortOrder ?? i),
        },
        { client: trx }
      )
    }
  }

  if (Array.isArray(data.classes)) {
    await CompetitionClass.query({ client: trx }).where('competitionId', competition.id).delete()
    for (const [i, catClass] of data.classes.entries()) {
      await CompetitionClass.create(
        {
          competitionId: competition.id,
          code: String(catClass.code ?? '').trim(),
          name: String(catClass.name ?? catClass.code ?? '').trim(),
          description: (catClass.description as string | null | undefined) ?? null,
          minAgeMonths: (catClass.minAgeMonths as number | null | undefined) ?? null,
          maxAgeMonths: (catClass.maxAgeMonths as number | null | undefined) ?? null,
          isNeuter: Boolean(catClass.isNeuter),
          isKittenOrJunior: Boolean(catClass.isKittenOrJunior),
          isSeparateBisCategory: Boolean(catClass.isSeparateBisCategory),
          sortOrder: Number(catClass.sortOrder ?? i),
        },
        { client: trx }
      )
    }
  }

  if (Array.isArray(data.judges)) {
    await Judge.query({ client: trx }).where('competitionId', competition.id).delete()
    for (const [i, j] of data.judges.entries()) {
      const row = j
      const userId = await resolveUserIdForImport(
        row,
        `Rozhodca #${i + 1} (${(row.name as string) ?? 'bez mena'})`,
        trx
      )
      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()
      let stewardUserId: number | null = null
      const stewardEmail = row.stewardEmail
      const stewardPhone = row.stewardPhone
      if (
        (typeof stewardEmail === 'string' && stewardEmail.trim().length > 0) ||
        (typeof stewardPhone === 'string' && stewardPhone.trim().length > 0)
      ) {
        stewardUserId = await resolveUserIdForImport(
          {
            email: typeof stewardEmail === 'string' ? stewardEmail : undefined,
            phone: typeof stewardPhone === 'string' ? stewardPhone : undefined,
          },
          `Stevard pre rozhodcu #${i + 1} (${user.fullName})`,
          trx
        )
      }
      await Judge.create(
        {
          competitionId: competition.id,
          name: user.fullName,
          userId: user.id,
          stewardUserId,
        },
        { client: trx }
      )
      await ensureStewardCompetitionRole(competition.id, stewardUserId, trx)
    }
  }

  const exhibitorByEmail = new Map<string, number>()
  const exhibitorByPhone = new Map<string, number>()

  if (Array.isArray(data.exhibitors)) {
    await Exhibitor.query({ client: trx }).where('competitionId', competition.id).delete()
    for (const [i, e] of data.exhibitors.entries()) {
      const userId = await resolveUserIdForImport(
        e,
        `Vystavovateľ #${i + 1} (${(e.name as string | undefined) ?? 'bez mena'})`,
        trx
      )
      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()
      const exhibitor = await Exhibitor.create(
        {
          competitionId: competition.id,
          name: user.fullName,
          email: user.email,
          phone: user.phone,
          userId: user.id,
        },
        { client: trx }
      )

      const ue = normalizeEmail(user.email)
      if (ue) exhibitorByEmail.set(ue, exhibitor.id)
      const up = normalizePhone(user.phone)
      if (up) exhibitorByPhone.set(up, exhibitor.id)
    }
  }

  if (Array.isArray(data.cats)) {
    await Cat.query({ client: trx }).where('competitionId', competition.id).delete()
    for (const c of data.cats) {
      const row = c
      await Cat.create(
        {
          competitionId: competition.id,
          registrationNumber: String(c.registrationNumber ?? c.number ?? ''),
          name: c.name as string,
          breed: c.breed as string,
          group: typeof c.group === 'string' ? c.group : '',
          groups: [],
          catClass:
            typeof c.class === 'string' && c.class.trim().length > 0 ? c.class.trim() : null,
          sex: (c.sex as 'male' | 'female' | null | undefined) ?? null,
          age: (c.age as string | null | undefined) ?? null,
          exhibitorId: resolveImportedCatExhibitorId(row, exhibitorByEmail, exhibitorByPhone),
          status:
            (c.status as 'waiting' | 'called' | 'judging' | 'completed' | undefined) ?? 'waiting',
        },
        { client: trx }
      )
    }
  }

  let judgeContactMaps: ReturnType<typeof buildJudgeIdMapsByContact> | null = null
  const ensureJudgeContactMaps = async () => {
    if (!judgeContactMaps) {
      const jl = await Judge.query({ client: trx })
        .where('competitionId', competition.id)
        .preload('user')
      judgeContactMaps = buildJudgeIdMapsByContact(jl)
    }
    return judgeContactMaps
  }

  if (Array.isArray(data.evaluations)) {
    await Evaluation.query({ client: trx }).where('competitionId', competition.id).delete()
    const { byEmail: judgeByEmail, byPhone: judgeByPhone } = await ensureJudgeContactMaps()

    const cats = await Cat.query({ client: trx }).where('competitionId', competition.id)
    const catByReg = new Map<string, number>()
    const validCatIds = new Set<number>()
    for (const cat of cats) {
      catByReg.set(cat.registrationNumber, cat.id)
      validCatIds.add(cat.id)
    }

    for (const [idx, e] of data.evaluations.entries()) {
      let catId: number | null = null
      const reg =
        e.catNumber !== null && e.catNumber !== undefined && String(e.catNumber).length > 0
          ? String(e.catNumber)
          : e.catRegistrationNumber !== null && e.catRegistrationNumber !== undefined
            ? String(e.catRegistrationNumber)
            : null
      if (reg) {
        catId = catByReg.get(reg) ?? null
      } else if (e.catId !== null && e.catId !== undefined && validCatIds.has(Number(e.catId))) {
        catId = Number(e.catId)
      }
      if (catId === null) {
        throw new Error(
          `Hodnotenie #${idx + 1}: mačka nie je nájdená (použite catNumber = registrationNumber z mačiek, alebo platné catId po importe).`
        )
      }
      const judgeRow = e
      const normEmail = normalizeEmail(judgeRow.judgeEmail)
      const normPhone = normalizePhone(judgeRow.judgePhone)
      const judgeWanted = normEmail !== null || normPhone !== null
      const judgeId = resolveImportedJudgeId(judgeRow, judgeByEmail, judgeByPhone)
      if (judgeWanted && judgeId === null) {
        const ref = normEmail ?? normPhone ?? '(kontakt)'
        throw new Error(
          `Hodnotenie #${idx + 1}: žiadny rozhodca v súťaži nezodpovedá judgeEmail/judgePhone „${ref}“.`
        )
      }

      await Evaluation.create(
        {
          competitionId: competition.id,
          catId,
          judgeId,
          round: e.round as 'nomination' | 'ring1' | 'ring2',
          grade: (e.grade as string | null | undefined) ?? null,
          titles: Array.isArray(e.titles) ? (e.titles as string[]) : [],
          position: (e.position as number | null | undefined) ?? null,
          accepted: (e.accepted as boolean | null | undefined) ?? null,
          nomBis: Boolean(e.nomBis ?? false),
        },
        { client: trx }
      )
    }
  }

  if (Array.isArray(data.bisAwards)) {
    await BisAward.query({ client: trx }).where('competitionId', competition.id).delete()
    const { byEmail: judgeByEmailBis, byPhone: judgeByPhoneBis } = await ensureJudgeContactMaps()

    const cats = await Cat.query({ client: trx }).where('competitionId', competition.id)
    const catByReg = new Map<string, number>()
    const validCatIds = new Set<number>()
    for (const cat of cats) {
      catByReg.set(cat.registrationNumber, cat.id)
      validCatIds.add(cat.id)
    }

    for (const [idx, award] of data.bisAwards.entries()) {
      let catId: number | null = null
      const reg =
        award.catNumber !== null &&
        award.catNumber !== undefined &&
        String(award.catNumber).length > 0
          ? String(award.catNumber)
          : award.catRegistrationNumber !== null && award.catRegistrationNumber !== undefined
            ? String(award.catRegistrationNumber)
            : null
      if (reg) {
        catId = catByReg.get(reg) ?? null
      } else if (
        award.catId !== null &&
        award.catId !== undefined &&
        validCatIds.has(Number(award.catId))
      ) {
        catId = Number(award.catId)
      }
      if (catId === null) {
        throw new Error(
          `BIS záznam #${idx + 1}: mačka nie je nájdená (použite catNumber = registrationNumber z mačiek, alebo platné catId po importe).`
        )
      }

      const awardRow = award
      const normEmailBis = normalizeEmail(awardRow.judgeEmail)
      const normPhoneBis = normalizePhone(awardRow.judgePhone)
      const judgeWantedBis = normEmailBis !== null || normPhoneBis !== null
      const judgeIdBis = resolveImportedJudgeId(awardRow, judgeByEmailBis, judgeByPhoneBis)
      if (judgeWantedBis && judgeIdBis === null) {
        const ref = normEmailBis ?? normPhoneBis ?? '(kontakt)'
        throw new Error(
          `BIS záznam #${idx + 1}: žiadny rozhodca v súťaži nezodpovedá judgeEmail/judgePhone „${ref}“.`
        )
      }

      await BisAward.create(
        {
          competitionId: competition.id,
          catId,
          judgeId: judgeIdBis,
          level: award.level as 'BIV' | 'NOM_BIS' | 'BIS',
          category: (award.category as string | null | undefined) ?? null,
          sex: (award.sex as 'male' | 'female' | null | undefined) ?? null,
          classCode: (award.classCode as string | null | undefined) ?? null,
          position: Number(award.position ?? 1),
          notes: (award.notes as string | null | undefined) ?? null,
        },
        { client: trx }
      )
    }
  }

  if (Array.isArray(data.judgingOrders)) {
    await JudgingOrder.query({ client: trx }).where('competitionId', competition.id).delete()
    const { byEmail: judgeByEmail, byPhone: judgeByPhone } = await ensureJudgeContactMaps()

    const cats = await Cat.query({ client: trx }).where('competitionId', competition.id)
    const catMap = new Map<string, number>()
    for (const c of cats) catMap.set(c.registrationNumber, c.id)
    const seenJudgeCatPairs = new Set<string>()

    for (const [idx, o] of data.judgingOrders.entries()) {
      const row = o
      const normEmail = normalizeEmail(row.judgeEmail)
      const normPhone = normalizePhone(row.judgePhone)
      const judgeWanted = normEmail !== null || normPhone !== null
      const judgeId = resolveImportedJudgeId(row, judgeByEmail, judgeByPhone)

      const catRegRaw =
        o.catNumber !== null && o.catNumber !== undefined && String(o.catNumber).trim() !== ''
          ? String(o.catNumber).trim()
          : null
      const catId = catRegRaw ? (catMap.get(catRegRaw) ?? null) : null
      const catWanted = catRegRaw !== null

      if (!judgeWanted && !catWanted) continue

      if (catWanted && catId === null) {
        throw new Error(
          `Judge protokol #${idx + 1}: mačka s registračným číslom „${catRegRaw}“ v tejto súťaži neexistuje.`
        )
      }
      if (judgeWanted && judgeId === null) {
        const ref = normEmail ?? normPhone ?? '(kontakt)'
        throw new Error(
          `Judge protokol #${idx + 1}: žiadny rozhodca v súťaži nezodpovedá judgeEmail/judgePhone „${ref}“.`
        )
      }
      if (judgeWanted && !catWanted) {
        throw new Error(`Judge protokol #${idx + 1}: pre rozhodcu zadajte aj catNumber.`)
      }
      if (!judgeWanted && catWanted) {
        throw new Error(
          `Judge protokol #${idx + 1}: pre mačku „${catRegRaw}“ zadajte judgeEmail alebo judgePhone.`
        )
      }

      if (judgeId !== null && catId !== null) {
        const pairKey = `${judgeId}:${catId}`
        if (seenJudgeCatPairs.has(pairKey)) {
          const ref = normEmail ?? normPhone ?? '(rozhodca)'
          throw new Error(
            `Judge protokol #${idx + 1}: kombinácia ${ref} + mačka ${o.catNumber ?? '(neznáma)'} je v importe dvakrát. U jedného rozhodcu môže mať daná mačka len jeden riadok.`
          )
        }
        seenJudgeCatPairs.add(pairKey)
        type Proto = 'waiting' | 'called' | 'judging' | 'completed'
        const normalizeProtocol = (raw: unknown): Proto =>
          raw === 'waiting' || raw === 'called' || raw === 'judging' || raw === 'completed'
            ? raw
            : 'waiting'

        const resolveProtocolGroupForImport = (): string | null => {
          const pg = row.protocolGroup
          if (typeof pg === 'string' && pg.trim().length > 0) return pg.trim().slice(0, 120)
          return null
        }

        await JudgingOrder.create(
          {
            competitionId: competition.id,
            judgeId,
            catId,
            orderPosition: Number(o.orderPosition ?? 0),
            tableNumber: Number(o.tableNumber ?? 1),
            protocolGroup: resolveProtocolGroupForImport(),
            protocolCallStatus: normalizeProtocol(o.protocolCallStatus),
            ring1ProtocolCallStatus: normalizeProtocol(
              'ring1ProtocolCallStatus' in o ? o.ring1ProtocolCallStatus : 'waiting'
            ),
            ring2ProtocolCallStatus: normalizeProtocol(
              'ring2ProtocolCallStatus' in o ? o.ring2ProtocolCallStatus : 'waiting'
            ),
          },
          { client: trx }
        )
      }
    }
  }
}
