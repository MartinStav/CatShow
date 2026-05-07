import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'

export default class CompetitionClass extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare minAgeMonths: number | null

  @column()
  declare maxAgeMonths: number | null

  @column()
  declare isNeuter: boolean

  @column()
  declare isKittenOrJunior: boolean

  @column()
  declare isSeparateBisCategory: boolean

  @column()
  declare sortOrder: number

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
