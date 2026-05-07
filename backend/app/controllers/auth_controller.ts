import User from '#models/user'
import { loginValidator, changePasswordValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import CompetitionRole from '#models/competition_role'
import Judge from '#models/judge'
import Exhibitor from '#models/exhibitor'
import {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
} from '#utils/login_rate_limiter'

async function getUserWithRoles(userId: number) {
  const roles = await CompetitionRole.query().where('userId', userId).preload('competition')

  const mapped = roles.map((cr) => ({
    id: cr.id,
    competitionId: cr.competitionId,
    competitionName: cr.competition?.name,
    role: cr.role,
  }))

  const judgeRows = await Judge.query().where('userId', userId).preload('competition')
  for (const j of judgeRows) {
    const hasJudgeRole = mapped.some(
      (r) => Number(r.competitionId) === Number(j.competitionId) && r.role === 'judge'
    )
    if (!hasJudgeRole) {
      mapped.push({
        id: -(j.id + 1_000_000),
        competitionId: j.competitionId,
        competitionName: j.competition?.name,
        role: 'judge',
      })
    }
  }

  const exhibitorRows = await Exhibitor.query().where('userId', userId).preload('competition')
  for (const ex of exhibitorRows) {
    const hasExhibitorRole = mapped.some(
      (r) => Number(r.competitionId) === Number(ex.competitionId) && r.role === 'exhibitor'
    )
    if (!hasExhibitorRole) {
      mapped.push({
        id: -(ex.id + 2_000_000),
        competitionId: ex.competitionId,
        competitionName: ex.competition?.name,
        role: 'exhibitor',
      })
    }
  }

  return mapped
}

/** E-mail prevedie na lowercase (PG je case-sensitive), telefón ponechá. */
function normalizeLoginIdentifier(identifier: string): string {
  const t = identifier.trim()
  if (t.includes('@')) {
    return t.toLowerCase()
  }
  return t
}

export default class AuthController {
  async login({ request, response }: HttpContext) {
    const { identifier: rawIdentifier, password } = await request.validateUsing(loginValidator)
    const identifier = normalizeLoginIdentifier(rawIdentifier ?? '')
    const ip = request.ip()

    const gate = checkLoginAllowed(identifier, ip)
    if (!gate.allowed) {
      response.header('Retry-After', String(gate.retryAfterSeconds))
      return response.tooManyRequests({
        message: 'Príliš veľa pokusov o prihlásenie. Skúste to neskôr.',
        retryAfterSeconds: gate.retryAfterSeconds,
      })
    }

    try {
      const user = await User.verifyCredentials(identifier, password)

      if (!user.isActive) {
        recordLoginFailure(identifier, ip)
        return response.unauthorized({ message: 'Account is deactivated' })
      }

      const token = await User.accessTokens.create(user)
      const competitionRoles = await getUserWithRoles(user.id)

      recordLoginSuccess(identifier, ip)

      return response.ok({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          competitionRoles,
        },
        token: token.value!.release(),
      })
    } catch {
      recordLoginFailure(identifier, ip)
      return response.unauthorized({ message: 'Invalid credentials' })
    }
  }

  async logout({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
    return response.ok({ message: 'Logged out successfully' })
  }

  async me({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const competitionRoles = await getUserWithRoles(user.id)

    return response.ok({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      competitionRoles,
    })
  }

  async changePassword({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, newPassword } = await request.validateUsing(changePasswordValidator)

    const verified = await hash.verify(user.password, currentPassword)
    if (!verified) {
      return response.badRequest({ message: 'Current password is incorrect' })
    }

    user.password = newPassword
    user.mustChangePassword = false
    await user.save()

    return response.ok({
      message: 'Password changed successfully',
      user: {
        id: user.id,
        mustChangePassword: user.mustChangePassword,
      },
    })
  }
}
