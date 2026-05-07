import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import PushSubscription from '#models/push_subscription'
import { webPushService } from '#services/web_push_service'

export default class PushNotificationsController {
  publicKey({ response }: HttpContext) {
    return response.ok({
      enabled: webPushService.enabled(),
      publicKey: webPushService.publicKey(),
    })
  }

  async subscribe({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const subscription = request.input('subscription')

    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const authKey = subscription?.keys?.auth

    if (!endpoint || !p256dh || !authKey) {
      return response.badRequest({ message: 'Neplatná push subscription.' })
    }

    const row = await PushSubscription.updateOrCreate(
      { endpoint },
      {
        userId: user.id,
        p256dh,
        auth: authKey,
        userAgent: request.header('user-agent') ?? null,
        lastSeenAt: DateTime.now(),
      }
    )

    return response.ok({ id: row.id })
  }

  async unsubscribe({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const endpoint = request.input('endpoint')
    if (!endpoint || typeof endpoint !== 'string') {
      return response.badRequest({ message: 'Chýba endpoint subscription.' })
    }

    await PushSubscription.query().where('userId', user.id).where('endpoint', endpoint).delete()
    return response.ok({ success: true })
  }
}
