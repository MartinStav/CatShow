import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'
import User from '#models/user'

export default class EventAuditLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number | null

  @column()
  declare userId: number | null

  @column()
  declare action: string

  @column()
  declare entityType: string | null

  @column()
  declare entityId: number | null

  @column()
  declare payload: Record<string, unknown> | null

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
