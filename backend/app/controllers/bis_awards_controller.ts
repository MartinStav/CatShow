import type { HttpContext } from '@adonisjs/core/http'
import BisAward from '#models/bis_award'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { applyBivAutoCalc, syncNomBisAwards } from '#utils/bis_compute'
import { writeAuditLog } from '#utils/event_audit'

const VALID_LEVELS = ['BIV', 'NOM_BIS', 'BIS'] as const
type BisLevel = (typeof VALID_LEVELS)[number]

function normalizeLevel(input: unknown): BisLevel | null {
  if (typeof input !== 'string') return null
  const upper = input.trim().toUpperCase()
  return VALID_LEVELS.includes(upper as BisLevel) ? (upper as BisLevel) : null
}

function trimNullable(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  return t.length > 0 ? t : null
}

export default class BisAwardsController {
  async index(ctx: HttpContext) {
    const { params, request, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const level = normalizeLevel(request.input('level'))
    const query = BisAward.query()
      .where('competitionId', competition.id)
      .preload('cat', (q) => q.preload('exhibitor'))
      .preload('judge')
      .orderBy([
        { column: 'level', order: 'asc' },
        { column: 'category', order: 'asc' },
        { column: 'position', order: 'asc' },
      ])

    if (level) query.where('level', level)

    const rows = await query
    return response.ok(rows)
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const level = normalizeLevel(request.input('level'))
    if (!level) {
      return response.badRequest({ message: 'Pole "level" musí byť BIV / NOM_BIS / BIS.' })
    }
    const catId = Number(request.input('catId'))
    if (!Number.isFinite(catId) || catId <= 0) {
      return response.badRequest({ message: 'Pole "catId" je povinné.' })
    }
    const judgeId = Number(request.input('judgeId'))
    const positionRaw = Number(request.input('position'))
    const position = Number.isFinite(positionRaw) && positionRaw > 0 ? Math.trunc(positionRaw) : 1

    const award = await BisAward.create({
      competitionId: competition.id,
      catId,
      judgeId: Number.isFinite(judgeId) && judgeId > 0 ? judgeId : null,
      level,
      category: trimNullable(request.input('category')),
      sex: trimNullable(request.input('sex')),
      classCode: trimNullable(request.input('classCode')),
      position,
      notes: trimNullable(request.input('notes')),
    })

    await writeAuditLog({
      action: 'competition.bis.award.created',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'bis_award',
      entityId: award.id,
      payload: { level, catId, position },
    })

    await award.load('cat')
    await award.load('judge')
    return response.created(award)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const award = await BisAward.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const data = request.only([
      'catId',
      'judgeId',
      'level',
      'category',
      'sex',
      'classCode',
      'position',
      'notes',
    ])

    if ('catId' in data && data.catId !== undefined && data.catId !== null) {
      const cid = Number(data.catId)
      if (Number.isFinite(cid) && cid > 0) award.catId = cid
    }
    if ('judgeId' in data) {
      const jid = Number(data.judgeId)
      award.judgeId = Number.isFinite(jid) && jid > 0 ? jid : null
    }
    if ('level' in data) {
      const lv = normalizeLevel(data.level)
      if (lv) award.level = lv
    }
    if ('category' in data) award.category = trimNullable(data.category)
    if ('sex' in data) award.sex = trimNullable(data.sex)
    if ('classCode' in data) award.classCode = trimNullable(data.classCode)
    if ('position' in data) {
      const p = Number(data.position)
      if (Number.isFinite(p) && p > 0) award.position = Math.trunc(p)
    }
    if ('notes' in data) award.notes = trimNullable(data.notes)

    await award.save()
    await writeAuditLog({
      action: 'competition.bis.award.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'bis_award',
      entityId: award.id,
    })

    await award.load('cat')
    await award.load('judge')
    return response.ok(award)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const award = await BisAward.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    await award.delete()

    await writeAuditLog({
      action: 'competition.bis.award.deleted',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'bis_award',
      entityId: Number(params.id),
    })
    return response.noContent()
  }

  /** Auto-výpočet BIV z hodnotení; `force=true` prepíše existujúce. */
  async recomputeBiv(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const force = request.input('force') === true || request.input('force') === 'true'
    const result = await applyBivAutoCalc(competition.id, { force })

    await writeAuditLog({
      action: 'competition.bis.biv.recomputed',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
      payload: { force, ...result },
    })

    return response.ok({ ok: true, ...result })
  }

  /**
   * Sync NomBIS z evaluations do bis_awards (vyčistí + vytvorí znova).
   */
  async syncNomBis(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    await syncNomBisAwards(competition.id)
    await writeAuditLog({
      action: 'competition.bis.nombis.synced',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
    })
    return response.ok({ ok: true })
  }
}
