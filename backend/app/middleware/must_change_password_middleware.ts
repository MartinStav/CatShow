import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Blokuje väčšinu API, kým má používateľ mustChangePassword, okrem me / logout / change-password.
 */
export default class MustChangePasswordMiddleware {
  async handle({ auth, request, response }: HttpContext, next: NextFn) {
    const user = auth.getUserOrFail()
    if (!user.mustChangePassword) {
      return next()
    }

    const method = request.method()
    const path = request.parsedUrl.pathname

    const allowed =
      (method === 'GET' && path.endsWith('/auth/me')) ||
      (method === 'POST' && path.endsWith('/auth/logout')) ||
      (method === 'PUT' && path.endsWith('/auth/change-password'))

    if (allowed) {
      return next()
    }

    return response.forbidden({
      message: 'Musíte zmeniť heslo pred pokračovaním.',
      code: 'MUST_CHANGE_PASSWORD',
    })
  }
}
