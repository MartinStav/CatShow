import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'

export default class CompetitionGrade extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare code: string

  @column()
  declare name: string | null

  @column()
  declare countsAsAccepted: boolean

  @column()
  declare eligibleForNomBis: boolean

  @column()
  declare sortOrder: number

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
