import { DateTime } from 'luxon'
import { BaseModel, beforeSave, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import CompetitionRole from '#models/competition_role'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email', 'phone'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  @beforeSave()
  static normalizeEmailAddress(user: User) {
    if (typeof user.email === 'string') {
      const t = user.email.trim()
      user.email = t.length > 0 ? t.toLowerCase() : null
    }
  }

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: 'superadmin' | 'admin' | 'user' | 'demo'

  @column()
  declare createdById: number | null

  @column()
  declare isActive: boolean

  /** Ak true, API (okrem zmeny hesla / me / logout) odmietne, kým si používateľ nenastaví vlastné heslo. */
  @column()
  declare mustChangePassword: boolean

  @hasMany(() => CompetitionRole)
  declare competitionRoles: HasMany<typeof CompetitionRole>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
