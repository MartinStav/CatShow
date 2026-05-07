import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'
import Cat from '#models/cat'
import Judge from '#models/judge'

export default class Evaluation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare catId: number

  @column()
  declare judgeId: number | null

  @column()
  declare round: 'nomination' | 'ring1' | 'ring2'

  @column()
  declare grade: string | null

  @column()
  declare titles: string[]

  @column()
  declare position: number | null

  @column()
  declare accepted: boolean | null

  @column()
  declare nomBis: boolean

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @belongsTo(() => Cat)
  declare cat: BelongsTo<typeof Cat>

  @belongsTo(() => Judge)
  declare judge: BelongsTo<typeof Judge>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
