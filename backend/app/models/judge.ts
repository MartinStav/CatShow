import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'
import User from '#models/user'
import Evaluation from '#models/evaluation'

export default class Judge extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare name: string

  @column()
  declare userId: number | null

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @column()
  declare stewardUserId: number | null

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'stewardUserId' })
  declare stewardUser: BelongsTo<typeof User>

  @hasMany(() => Evaluation)
  declare evaluations: HasMany<typeof Evaluation>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
