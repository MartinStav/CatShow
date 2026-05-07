import type { HttpContext } from '@adonisjs/core/http'
import JudgingOrder, { type ProtocolCallStatus } from '#models/judging_order'
import Judge from '#models/judge'
import Cat from '#models/cat'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { canRoundRunNow, isSetupLocked } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'
import { protocolRoundFromCompetition } from '#utils/judging_order_protocol_round'
import { webPushService } from '#services/web_push_service'

const PROTOCOL_CALL_STATUSES: readonly ProtocolCallStatus[] = [
  'waiting',
  'called',
  'judging',
  'completed',
]

async function validateJudgingOrderInput(
  competitionId: number,
  judgeId: number,
  catId: number,
  excludeOrderId?: number
): Promise<string | null> {
  const judge = await Judge.query()
    .where('competitionId', competitionId)
    .where('id', judgeId)
    .first()
  if (!judge) {
    return 'Rozhodca nepatrí do tejto súťaže.'
  }
  const cat = await Cat.query().where('competitionId', competitionId).where('id', catId).first()
  if (!cat) {
    return 'Mačka nepatrí do tejto súťaže.'
  }

  const dupQ = JudgingOrder.query()
    .where('competitionId', competitionId)
    .where('judgeId', judgeId)
    .where('catId', catId)
  if (excludeOrderId !== undefined) {
    dupQ.whereNot('id', excludeOrderId)
  }
  const dup = await dupQ.first()
  if (dup) {
    return 'Tento rozhodca už má túto mačku v poradí zapísanú.'
  }
  return null
}

function parseJudgingOrderBody(request: HttpContext['request']):
  | {
      judgeId: number
      catId: number
      orderPosition: number
      tableNumber: number
      protocolGroup: string | null
    }
  | { error: string } {
  const raw = request.only(['judgeId', 'catId', 'orderPosition', 'tableNumber', 'protocolGroup'])
  const judgeId = Number(raw.judgeId)
  const catId = Number(raw.catId)
  const orderPosition =
    raw.orderPosition !== null && raw.orderPosition !== undefined ? Number(raw.orderPosition) : 0
  const tableNumber =
    raw.tableNumber !== null && raw.tableNumber !== undefined ? Number(raw.tableNumber) : 1

  const grpRaw = raw.protocolGroup
  let protocolGroup: string | null = null
  if (typeof grpRaw === 'string') {
    const t = grpRaw.trim().slice(0, 120)
    protocolGroup = t.length > 0 ? t : null
  }

  if (!Number.isFinite(judgeId) || judgeId < 1 || !Number.isInteger(judgeId)) {
    return { error: 'Vyberte rozhodcu.' }
  }
  if (!Number.isFinite(catId) || catId < 1 || !Number.isInteger(catId)) {
    return { error: 'Vyberte mačku.' }
  }
  if (!Number.isFinite(orderPosition) || orderPosition < 0) {
    return { error: 'Poradie musí byť nezáporné číslo.' }
  }
  if (!Number.isFinite(tableNumber) || tableNumber < 1) {
    return { error: 'Číslo stola musí byť aspoň 1.' }
  }

  return {
    judgeId,
    catId,
    orderPosition: Math.floor(orderPosition),
    tableNumber: Math.floor(tableNumber),
    protocolGroup,
  }
}

export default class JudgingOrdersController {
  async index(ctx: HttpContext) {
    const { params, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'read')
    if (!competition) return

    const orders = await JudgingOrder.query()
      .where('competitionId', competition.id)
      .preload('judge')
      .preload('cat')
      .orderBy('tableNumber', 'asc')
      .orderBy('protocolGroup', 'asc')
      .orderBy('orderPosition', 'asc')
    return response.ok(orders)
  }

  async store(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné meniť judge protokol.',
      })
    }

    const parsed = parseJudgingOrderBody(request)
    if ('error' in parsed) {
      return response.badRequest({ message: parsed.error })
    }
    const err = await validateJudgingOrderInput(competition.id, parsed.judgeId, parsed.catId)
    if (err) {
      return response.badRequest({ message: err })
    }

    const order = await JudgingOrder.create({
      competitionId: competition.id,
      judgeId: parsed.judgeId,
      catId: parsed.catId,
      orderPosition: parsed.orderPosition,
      tableNumber: parsed.tableNumber,
      protocolGroup: parsed.protocolGroup,
      protocolCallStatus: 'waiting',
      ring1ProtocolCallStatus: 'waiting',
      ring2ProtocolCallStatus: 'waiting',
    })
    await order.load('judge')
    await order.load('cat')
    await writeAuditLog({
      action: 'judging_order.created',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judging_order',
      entityId: order.id,
      payload: {
        judgeId: order.judgeId,
        catId: order.catId,
        protocolGroup: order.protocolGroup,
      },
    })
    return response.created(order)
  }

  async update(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné meniť judge protokol.',
      })
    }

    const order = await JudgingOrder.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const parsed = parseJudgingOrderBody(request)
    if ('error' in parsed) {
      return response.badRequest({ message: parsed.error })
    }

    const err = await validateJudgingOrderInput(
      competition.id,
      parsed.judgeId,
      parsed.catId,
      order.id
    )
    if (err) {
      return response.badRequest({ message: err })
    }

    order.merge({
      judgeId: parsed.judgeId,
      catId: parsed.catId,
      orderPosition: parsed.orderPosition,
      tableNumber: parsed.tableNumber,
      protocolGroup: parsed.protocolGroup,
    })
    await order.save()
    await order.load('judge')
    await order.load('cat')
    await writeAuditLog({
      action: 'judging_order.updated',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judging_order',
      entityId: order.id,
      payload: {
        judgeId: order.judgeId,
        catId: order.catId,
        protocolGroup: order.protocolGroup,
      },
    })
    return response.ok(order)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, auth } = ctx
    const actor = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'manage')
    if (!competition) return
    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Počas aktívneho kola nie je možné meniť judge protokol.',
      })
    }

    const order = await JudgingOrder.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()
    await order.delete()
    await writeAuditLog({
      action: 'judging_order.deleted',
      userId: actor.id,
      competitionId: competition.id,
      entityType: 'judging_order',
      entityId: order.id,
    })
    return response.noContent()
  }

  /** Mení vyvolávanie pre riadok protokolu (nie globálny `cats.status`). */
  async updateCallStatus(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const user = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.competition_id, 'operate')
    if (!competition) return

    const order = await JudgingOrder.query()
      .where('competitionId', competition.id)
      .where('id', params.id)
      .firstOrFail()

    const raw = request.only(['protocolCallStatus', 'protocol_call_status']) as Record<
      string,
      unknown
    >
    const incoming = raw.protocolCallStatus ?? raw.protocol_call_status
    if (
      typeof incoming !== 'string' ||
      !(PROTOCOL_CALL_STATUSES as readonly string[]).includes(incoming)
    ) {
      return response.badRequest({ message: 'Neplatný stav vyvolávania.' })
    }
    const newStatus = incoming as ProtocolCallStatus
    const protocolRound = protocolRoundFromCompetition(competition.currentRound)
    if (!protocolRound) {
      return response.badRequest({
        message: 'Vyvolávanie cez judge protokol nie je v aktuálnej fáze súťaže k dispozícii.',
      })
    }

    let oldStatus: ProtocolCallStatus
    switch (protocolRound) {
      case 'nomination':
        oldStatus = order.protocolCallStatus
        order.protocolCallStatus = newStatus
        break
      case 'ring1':
        oldStatus = (order.ring1ProtocolCallStatus ?? 'waiting') as ProtocolCallStatus
        order.ring1ProtocolCallStatus = newStatus
        break
      case 'ring2':
        oldStatus = (order.ring2ProtocolCallStatus ?? 'waiting') as ProtocolCallStatus
        order.ring2ProtocolCallStatus = newStatus
        break
    }

    if (isSetupLocked(competition)) {
      if (newStatus !== oldStatus && competition.currentRound !== null) {
        const roundCheck = canRoundRunNow(competition, competition.currentRound)
        if (!roundCheck.ok) {
          return response.conflict({ message: roundCheck.message })
        }
      }
    }

    await order.save()
    await order.load('judge')
    await order.load('cat', (q) => q.preload('exhibitor'))

    await writeAuditLog({
      action: 'judging_order.call_status.updated',
      userId: user.id,
      competitionId: competition.id,
      entityType: 'judging_order',
      entityId: order.id,
      payload: {
        fromStatus: oldStatus,
        toStatus: newStatus,
        catId: order.catId,
        judgeId: order.judgeId,
        protocolPhase: protocolRound,
      },
    })

    const cat = order.cat
    if (
      oldStatus !== newStatus &&
      cat?.exhibitor?.userId !== null &&
      cat?.exhibitor?.userId !== undefined
    ) {
      await webPushService.sendCatStatusChanged({
        userId: cat.exhibitor.userId,
        competitionId: competition.id,
        competitionName: competition.name,
        catName: cat.name,
        catId: cat.id,
        oldStatus,
        newStatus,
      })
    }

    return response.ok(order)
  }
}
