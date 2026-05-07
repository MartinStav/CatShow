import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Competition from '#models/competition'

export default class CompetitionRole extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare competitionId: number

  @column()
  declare role: 'steward' | 'judge' | 'exhibitor' | 'administrator' | 'telka'

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
