import type { IncomingMessage } from 'node:http'
import type { Server } from 'node:http'
import { WebSocketServer, WebSocket, type RawData } from 'ws'
import { Secret } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'
import { getAccessibleCompetition } from '#utils/competition_access'

const WS_PATH = '/api/v1/realtime/ws'

interface ClientAttachment {
  userId: number
  userRole: string
  subscribedCompetitionIds: Set<number>
  wantCatalog: boolean
}

function clientMeta(ws: WebSocket): ClientAttachment | undefined {
  return (ws as WebSocket & { __catshow?: ClientAttachment }).__catshow
}

class CompetitionRealtimeHub {
  private wss: WebSocketServer | null = null
  private readonly competitionTimers = new Map<number, NodeJS.Timeout>()
  private catalogTimer: NodeJS.Timeout | null = null
  private readonly competitionDebounceMs = 130
  private readonly catalogDebounceMs = 220

  attach(nodeServer: Server) {
    if (this.wss) return

    this.wss = new WebSocketServer({
      server: nodeServer,
      path: WS_PATH,
    })

    this.wss.on('connection', (ws, req) => {
      void this.onConnection(ws, req)
    })

    logger.info('Realtime WebSocket server attached at path %s', WS_PATH)
  }

  scheduleCompetitionBroadcast(competitionId: number) {
    if (!this.wss || !Number.isFinite(competitionId)) return
    const id = Math.floor(competitionId)
    const prev = this.competitionTimers.get(id)
    if (prev) clearTimeout(prev)
    this.competitionTimers.set(
      id,
      setTimeout(() => {
        this.competitionTimers.delete(id)
        this.flushCompetition(id)
      }, this.competitionDebounceMs)
    )
  }

  scheduleCatalogBroadcast() {
    if (!this.wss) return
    if (this.catalogTimer) clearTimeout(this.catalogTimer)
    this.catalogTimer = setTimeout(() => {
      this.catalogTimer = null
      this.flushCatalog()
    }, this.catalogDebounceMs)
  }

  private flushCompetition(competitionId: number) {
    if (!this.wss) return
    const payload = JSON.stringify({
      type: 'invalidate',
      competitionId,
      reason: 'data',
    })
    this.wss.clients.forEach((client) => {
      const att = clientMeta(client)
      if (!att || client.readyState !== WebSocket.OPEN) return
      if (att.subscribedCompetitionIds.has(competitionId)) {
        client.send(payload)
      }
    })
  }

  private flushCatalog() {
    if (!this.wss) return
    const payload = JSON.stringify({ type: 'invalidate_catalog' })
    this.wss.clients.forEach((client) => {
      const att = clientMeta(client)
      if (!att?.wantCatalog || client.readyState !== WebSocket.OPEN) return
      client.send(payload)
    })
  }

  private parseToken(req: IncomingMessage): string | null {
    try {
      const host = req.headers.host ?? '127.0.0.1'
      const pathname = req.url ?? ''
      const token = new URL(pathname, `http://${host}`).searchParams.get('token')
      const t = token?.trim()
      return t && t.length > 0 ? t : null
    } catch {
      return null
    }
  }

  private async onConnection(ws: WebSocket, req: IncomingMessage) {
    const tokenRaw = this.parseToken(req)
    if (!tokenRaw) {
      ws.close(4401)
      return
    }

    const accessToken = await User.accessTokens.verify(new Secret(tokenRaw))
    if (!accessToken || accessToken.isExpired()) {
      ws.close(4401)
      return
    }

    const user = await User.find(accessToken.tokenableId)
    if (!user || !user.isActive || user.mustChangePassword) {
      ws.close(4403)
      return
    }

    const att: ClientAttachment = {
      userId: user.id,
      userRole: user.role,
      subscribedCompetitionIds: new Set(),
      wantCatalog: false,
    }
    ;(ws as WebSocket & { __catshow: ClientAttachment }).__catshow = att

    ws.on('message', (buf) => {
      void this.onClientMessage(ws, buf)
    })
    ws.send(JSON.stringify({ type: 'connected' }))
  }

  private async onClientMessage(ws: WebSocket, chunk: RawData) {
    const rawText = normalizeRawData(chunk)
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(rawText) as Record<string, unknown>
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Neplatný JSON.' }))
      return
    }

    if (msg.type !== 'subscribe') return

    const att = clientMeta(ws)
    if (!att) return

    let competitionIds: number[] = []
    const idsRaw = msg.competitionIds
    if (Array.isArray(idsRaw)) {
      competitionIds = [...new Set(idsRaw.map((x) => Number(x)))]
        .filter((n) => Number.isFinite(n) && n >= 1 && Number.isInteger(n))
        .map((n) => Math.floor(n))
    }

    att.subscribedCompetitionIds.clear()
    for (const cid of competitionIds) {
      const competition = await getAccessibleCompetition(att.userId, att.userRole, cid, 'read')
      if (competition) {
        att.subscribedCompetitionIds.add(competition.id)
      }
    }

    att.wantCatalog = msg.catalog === true

    ws.send(
      JSON.stringify({
        type: 'subscribed',
        competitionIds: [...att.subscribedCompetitionIds],
        catalog: att.wantCatalog,
      })
    )
  }
}

function normalizeRawData(chunk: RawData): string {
  if (Buffer.isBuffer(chunk)) return chunk.toString('utf8')
  if (typeof chunk === 'string') return chunk
  if (chunk instanceof ArrayBuffer) return Buffer.from(chunk).toString('utf8')
  if (Array.isArray(chunk)) return Buffer.concat(chunk).toString('utf8')
  return Buffer.from(chunk as ArrayLike<number>).toString('utf8')
}

export const competitionRealtimeHub = new CompetitionRealtimeHub()
