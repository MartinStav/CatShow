import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Competition from '#models/competition'
import Judge from '#models/judge'
import Cat from '#models/cat'

export type ProtocolCallStatus = 'waiting' | 'called' | 'judging' | 'completed'

export default class JudgingOrder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare competitionId: number

  @column()
  declare judgeId: number

  @column()
  declare catId: number

  @column()
  declare orderPosition: number

  @column()
  declare tableNumber: number

  /** Text bloku/skupiny na stole — rovnaký reťazec = tá istá skupina (tab). */
  @column()
  declare protocolGroup: string | null

  /** Nominácia: vyvolávanie pre páru sudca–mačka. */
  @column()
  declare protocolCallStatus: ProtocolCallStatus

  /** Ring 1: samostatné vyvolávanie. */
  @column({ columnName: 'ring1_protocol_call_status' })
  declare ring1ProtocolCallStatus: ProtocolCallStatus

  /** Ring 2: samostatné vyvolávanie. */
  @column({ columnName: 'ring2_protocol_call_status' })
  declare ring2ProtocolCallStatus: ProtocolCallStatus

  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>

  @belongsTo(() => Judge)
  declare judge: BelongsTo<typeof Judge>

  @belongsTo(() => Cat)
  declare cat: BelongsTo<typeof Cat>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
