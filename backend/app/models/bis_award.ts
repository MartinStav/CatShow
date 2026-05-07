import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'
import Cat from '#models/cat'
import Judge from '#models/judge'

type BisAwardLevel = 'BIV' | 'NOM_BIS' | 'BIS'

export default class BisAward extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare catId: number

  @column()
  declare judgeId: number | null

  @column()
  declare level: BisAwardLevel

  @column()
  declare category: string | null

  @column()
  declare sex: string | null

  @column()
  declare classCode: string | null

  @column()
  declare position: number

  @column()
  declare notes: string | null

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
