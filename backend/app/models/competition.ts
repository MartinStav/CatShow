import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Cat from '#models/cat'
import Judge from '#models/judge'
import Group from '#models/group'
import Exhibitor from '#models/exhibitor'
import CompetitionRole from '#models/competition_role'
import Evaluation from '#models/evaluation'
import CompetitionTitle from '#models/competition_title'
import CompetitionGrade from '#models/competition_grade'
import CompetitionClass from '#models/competition_class'
import BisAward from '#models/bis_award'

export default class Competition extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare date: string

  @column()
  declare description: string | null

  @column()
  declare location: string | null

  @column()
  declare status: 'active' | 'paused' | 'finished' | 'scheduled'

  @column()
  declare published: boolean

  @column()
  declare currentRound: 'nomination' | 'ring1' | 'ring2' | 'bis' | null

  @column()
  declare roundsEnabled: string[]

  /** Kumulovaný čas (ms) strávený v stave „prebieha“ (bez aktuálneho bežiaceho segmentu). */
  @column()
  declare accumulatedActiveMs: number

  /** Začiatok aktuálneho segmentu stavu „prebieha“; null ak nie je prebieha. */
  @column.dateTime()
  declare activeSegmentStartedAt: DateTime | null

  @column()
  declare createdById: number | null

  @hasMany(() => Cat)
  declare cats: HasMany<typeof Cat>

  @hasMany(() => Judge)
  declare judges: HasMany<typeof Judge>

  @hasMany(() => Group)
  declare groups: HasMany<typeof Group>

  @hasMany(() => Exhibitor)
  declare exhibitors: HasMany<typeof Exhibitor>

  @hasMany(() => CompetitionRole)
  declare competitionRoles: HasMany<typeof CompetitionRole>

  @hasMany(() => Evaluation)
  declare evaluations: HasMany<typeof Evaluation>

  @hasMany(() => CompetitionTitle)
  declare titles: HasMany<typeof CompetitionTitle>

  @hasMany(() => CompetitionGrade)
  declare grades: HasMany<typeof CompetitionGrade>

  @hasMany(() => CompetitionClass)
  declare classes: HasMany<typeof CompetitionClass>

  @hasMany(() => BisAward)
  declare bisAwards: HasMany<typeof BisAward>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
