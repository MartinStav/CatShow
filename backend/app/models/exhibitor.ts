import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'
import User from '#models/user'
import Cat from '#models/cat'

export default class Exhibitor extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare name: string

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare userId: number | null

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Cat)
  declare cats: HasMany<typeof Cat>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
