import { DateTime } from 'luxon'
import webpush from 'web-push'
import PushSubscription from '#models/push_subscription'

const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? ''
const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? ''
const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? 'mailto:admin@example.com'

const enabled = publicKey.length > 0 && privateKey.length > 0
if (enabled) {
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

type StatusValue = 'waiting' | 'called' | 'judging' | 'completed'

function statusLabel(status: StatusValue): string {
  switch (status) {
    case 'called':
      return 'volaná'
    case 'judging':
      return 'hodnotí sa'
    case 'completed':
      return 'hodnotenie ukončené'
    default:
      return 'čaká'
  }
}

export const webPushService = {
  enabled() {
    return enabled
  },

  publicKey() {
    return publicKey
  },

  async sendCatStatusChanged(input: {
    userId: number
    competitionId: number
    competitionName: string
    catName: string
    catId: number
    oldStatus: StatusValue
    newStatus: StatusValue
  }) {
    if (!enabled || input.oldStatus === input.newStatus) return

    const rows = await PushSubscription.query().where('userId', input.userId)
    if (rows.length === 0) return

    const payload = JSON.stringify({
      title: 'Zmena stavu mačky',
      body: `${input.catName}: ${statusLabel(input.oldStatus)} -> ${statusLabel(input.newStatus)} (${input.competitionName})`,
      tag: `cat-status-${input.catId}`,
      url: `/competition/${input.competitionId}/my-overview`,
      data: {
        catId: input.catId,
        competitionId: input.competitionId,
      },
    })

    for (const row of rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          { TTL: 60 }
        )
        row.lastSeenAt = DateTime.now()
        await row.save()
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await row.delete()
        }
      }
    }
  },
}
