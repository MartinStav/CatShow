import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'
import Exhibitor from '#models/exhibitor'
import Evaluation from '#models/evaluation'

export default class Cat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare registrationNumber: string

  @column()
  declare name: string

  @column()
  declare breed: string

  @column()
  declare group: string

  @column()
  declare groups: string[]

  /** Voľný text triedy (typicky `competition_classes.code`, ale bez FK). */
  @column({ columnName: 'class', serializeAs: 'class' })
  declare catClass: string | null

  @column()
  declare sex: string | null

  @column()
  declare age: string | null

  @column()
  declare exhibitorId: number | null

  @column()
  declare status: 'waiting' | 'called' | 'judging' | 'completed'

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @belongsTo(() => Exhibitor)
  declare exhibitor: BelongsTo<typeof Exhibitor>

  @hasMany(() => Evaluation)
  declare evaluations: HasMany<typeof Evaluation>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
