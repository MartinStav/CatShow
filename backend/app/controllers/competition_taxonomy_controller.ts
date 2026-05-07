import type { HttpContext } from '@adonisjs/core/http'
import CompetitionGrade from '#models/competition_grade'
import CompetitionTitle from '#models/competition_title'
import CompetitionClass from '#models/competition_class'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { writeAuditLog } from '#utils/event_audit'

function trimNullable(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  return t.length > 0 ? t : null
}

function asString(input: unknown): string {
  return typeof input === 'string' ? input.trim() : ''
}

function asArrayOfStrings(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return [
    ...new Set(
      input
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
    ),
  ]
}

function asInt(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return Math.trunc(input)
  if (typeof input === 'string' && input.trim().length > 0) {
    const n = Number(input.trim())
    return Number.isFinite(n) ? Math.trunc(n) : null
  }
  return null
}

function asBool(input: unknown, fallback = false): boolean {
  if (typeof input === 'boolean') return input
  if (input === 'true' || input === 1 || input === '1') return true
  if (input === 'false' || input === 0 || input === '0') return false
  return fallback
}

/** CRUD pre taxonómiu (Grades / Titles / Classes) per súťaž — naplňa sa cez import. */
export default class CompetitionTaxonomyController {
  // -------------------- Grades --------------------

  async listGrades(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const grades = await CompetitionGrade.query()
      .where('competitionId', competition.id)
      .orderBy('sortOrder', 'asc')
    return response.ok(grades)
  }

  async storeGrade(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const code = asString(request.input('code'))
    if (!code) return response.badRequest({ message: 'Pole "code" je povinné.' })

    const exists = await CompetitionGrade.query()
      .where('competitionId', competition.id)
      .where('code', code)
      .first()
    if (exists) {
      return response.conflict({ message: `Grade s kódom "${code}" už existuje.` })
    }

    const grade = await CompetitionGrade.create({
      competitionId: competition.id,
      code,
      name: trimNullable(request.input('name')),
      countsAsAccepted: asBool(request.input('countsAsAccepted'), false),
      eligibleForNomBis: asBool(request.input('eligibleForNomBis'), false),
      sortOrder: asInt(request.input('sortOrder')) ?? 0,
    })

    await writeAuditLog({
      action: 'competition.grade.created',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_grade',
      entityId: grade.id,
      payload: { code: grade.code },
    })
    return response.created(grade)
  }

  async updateGrade(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const grade = await CompetitionGrade.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const data = request.only([
      'code',
      'name',
      'countsAsAccepted',
      'eligibleForNomBis',
      'sortOrder',
    ])
    if (typeof data.code === 'string') {
      const newCode = data.code.trim()
      if (!newCode) return response.badRequest({ message: 'Pole "code" je povinné.' })
      if (newCode !== grade.code) {
        const conflict = await CompetitionGrade.query()
          .where('competitionId', competition.id)
          .where('code', newCode)
          .first()
        if (conflict) {
          return response.conflict({ message: `Grade s kódom "${newCode}" už existuje.` })
        }
        grade.code = newCode
      }
    }
    if ('name' in data) grade.name = trimNullable(data.name)
    if ('countsAsAccepted' in data)
      grade.countsAsAccepted = asBool(data.countsAsAccepted, grade.countsAsAccepted)
    if ('eligibleForNomBis' in data)
      grade.eligibleForNomBis = asBool(data.eligibleForNomBis, grade.eligibleForNomBis)
    if ('sortOrder' in data) grade.sortOrder = asInt(data.sortOrder) ?? grade.sortOrder

    await grade.save()
    await writeAuditLog({
      action: 'competition.grade.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_grade',
      entityId: grade.id,
    })
    return response.ok(grade)
  }

  async destroyGrade(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const grade = await CompetitionGrade.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    const code = grade.code
    await grade.delete()
    await writeAuditLog({
      action: 'competition.grade.deleted',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_grade',
      entityId: Number(params.id),
      payload: { code },
    })
    return response.noContent()
  }

  // -------------------- Titles --------------------

  async listTitles(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const titles = await CompetitionTitle.query()
      .where('competitionId', competition.id)
      .orderBy('sortOrder', 'asc')
    return response.ok(titles)
  }

  async storeTitle(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const code = asString(request.input('code'))
    if (!code) return response.badRequest({ message: 'Pole "code" je povinné.' })

    const exists = await CompetitionTitle.query()
      .where('competitionId', competition.id)
      .where('code', code)
      .first()
    if (exists) {
      return response.conflict({ message: `Titul s kódom "${code}" už existuje.` })
    }

    const title = await CompetitionTitle.create({
      competitionId: competition.id,
      code,
      name: trimNullable(request.input('name')),
      description: trimNullable(request.input('description')),
      classCodes: asArrayOfStrings(request.input('classCodes')),
      sortOrder: asInt(request.input('sortOrder')) ?? 0,
    })

    await writeAuditLog({
      action: 'competition.title.created',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_title',
      entityId: title.id,
      payload: { code: title.code },
    })
    return response.created(title)
  }

  async updateTitle(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const title = await CompetitionTitle.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const data = request.only(['code', 'name', 'description', 'classCodes', 'sortOrder'])
    if (typeof data.code === 'string') {
      const newCode = data.code.trim()
      if (!newCode) return response.badRequest({ message: 'Pole "code" je povinné.' })
      if (newCode !== title.code) {
        const conflict = await CompetitionTitle.query()
          .where('competitionId', competition.id)
          .where('code', newCode)
          .first()
        if (conflict) {
          return response.conflict({ message: `Titul s kódom "${newCode}" už existuje.` })
        }
        title.code = newCode
      }
    }
    if ('name' in data) title.name = trimNullable(data.name)
    if ('description' in data) title.description = trimNullable(data.description)
    if ('classCodes' in data) title.classCodes = asArrayOfStrings(data.classCodes)
    if ('sortOrder' in data) title.sortOrder = asInt(data.sortOrder) ?? title.sortOrder

    await title.save()
    await writeAuditLog({
      action: 'competition.title.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_title',
      entityId: title.id,
    })
    return response.ok(title)
  }

  async destroyTitle(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const title = await CompetitionTitle.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    const code = title.code
    await title.delete()
    await writeAuditLog({
      action: 'competition.title.deleted',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_title',
      entityId: Number(params.id),
      payload: { code },
    })
    return response.noContent()
  }

  // -------------------- Classes --------------------

  async listClasses(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const classes = await CompetitionClass.query()
      .where('competitionId', competition.id)
      .orderBy('sortOrder', 'asc')
    return response.ok(classes)
  }

  async storeClass(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const code = asString(request.input('code'))
    const name = asString(request.input('name'))
    if (!code) return response.badRequest({ message: 'Pole "code" je povinné.' })
    if (!name) return response.badRequest({ message: 'Pole "name" je povinné.' })

    const exists = await CompetitionClass.query()
      .where('competitionId', competition.id)
      .where('code', code)
      .first()
    if (exists) {
      return response.conflict({ message: `Trieda s kódom "${code}" už existuje.` })
    }

    const cls = await CompetitionClass.create({
      competitionId: competition.id,
      code,
      name,
      description: trimNullable(request.input('description')),
      minAgeMonths: asInt(request.input('minAgeMonths')),
      maxAgeMonths: asInt(request.input('maxAgeMonths')),
      isNeuter: asBool(request.input('isNeuter'), false),
      isKittenOrJunior: asBool(request.input('isKittenOrJunior'), false),
      isSeparateBisCategory: asBool(request.input('isSeparateBisCategory'), false),
      sortOrder: asInt(request.input('sortOrder')) ?? 0,
    })

    await writeAuditLog({
      action: 'competition.class.created',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_class',
      entityId: cls.id,
      payload: { code: cls.code },
    })
    return response.created(cls)
  }

  async updateClass(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const cls = await CompetitionClass.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const data = request.only([
      'code',
      'name',
      'description',
      'minAgeMonths',
      'maxAgeMonths',
      'isNeuter',
      'isKittenOrJunior',
      'isSeparateBisCategory',
      'sortOrder',
    ])
    if (typeof data.code === 'string') {
      const newCode = data.code.trim()
      if (!newCode) return response.badRequest({ message: 'Pole "code" je povinné.' })
      if (newCode !== cls.code) {
        const conflict = await CompetitionClass.query()
          .where('competitionId', competition.id)
          .where('code', newCode)
          .first()
        if (conflict) {
          return response.conflict({ message: `Trieda s kódom "${newCode}" už existuje.` })
        }
        cls.code = newCode
      }
    }
    if (typeof data.name === 'string') {
      const newName = data.name.trim()
      if (newName) cls.name = newName
    }
    if ('description' in data) cls.description = trimNullable(data.description)
    if ('minAgeMonths' in data) cls.minAgeMonths = asInt(data.minAgeMonths)
    if ('maxAgeMonths' in data) cls.maxAgeMonths = asInt(data.maxAgeMonths)
    if ('isNeuter' in data) cls.isNeuter = asBool(data.isNeuter, cls.isNeuter)
    if ('isKittenOrJunior' in data)
      cls.isKittenOrJunior = asBool(data.isKittenOrJunior, cls.isKittenOrJunior)
    if ('isSeparateBisCategory' in data)
      cls.isSeparateBisCategory = asBool(data.isSeparateBisCategory, cls.isSeparateBisCategory)
    if ('sortOrder' in data) cls.sortOrder = asInt(data.sortOrder) ?? cls.sortOrder

    await cls.save()
    await writeAuditLog({
      action: 'competition.class.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_class',
      entityId: cls.id,
    })
    return response.ok(cls)
  }

  async destroyClass(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return

    const cls = await CompetitionClass.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    const code = cls.code
    await cls.delete()
    await writeAuditLog({
      action: 'competition.class.deleted',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition_class',
      entityId: Number(params.id),
      payload: { code },
    })
    return response.noContent()
  }
}
