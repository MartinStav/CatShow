import logger from '@adonisjs/core/services/logger'
import EventAuditLog from '#models/event_audit_log'

type AuditInput = {
  action: string
  userId?: number | null
  competitionId?: number | null
  entityType?: string | null
  entityId?: number | null
  payload?: Record<string, unknown> | null
}

/** Zapíše audit log; pri chybe len logne warning, výnimku nepropaguje. */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await EventAuditLog.create({
      action: input.action,
      userId: input.userId ?? null,
      competitionId: input.competitionId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      payload: input.payload ?? null,
    })
  } catch (err) {
    logger.warn(
      {
        err,
        action: input.action,
        userId: input.userId ?? null,
        competitionId: input.competitionId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
      'Failed to write audit log entry'
    )
  }
}
