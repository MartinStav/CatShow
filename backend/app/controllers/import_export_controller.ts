import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { ensureCompetitionAccess } from '#utils/competition_access'
import { isSetupLocked } from '#utils/competition_flow'
import { writeAuditLog } from '#utils/event_audit'
import { buildCompetitionExport } from '#services/competition_export_service'
import { applyCompetitionImport } from '#services/competition_import_service'

export default class ImportExportController {
  async export(ctx: HttpContext) {
    const { params, request, response } = ctx
    const competition = await ensureCompetitionAccess(ctx, params.id, 'read')
    if (!competition) return

    const mode = request.input('mode', 'full')
    const result = await buildCompetitionExport(competition, mode)
    return response.ok(result)
  }

  async import(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const currentUser = auth.getUserOrFail()
    const competition = await ensureCompetitionAccess(ctx, params.id, 'manage')
    if (!competition) return

    if (isSetupLocked(competition)) {
      return response.conflict({
        message: 'Import nie je povolený počas aktívneho kola súťaže.',
      })
    }

    const data = request.body() as Record<string, unknown>

    try {
      await db.transaction(async (trx) => {
        await applyCompetitionImport({
          competition,
          payload: data,
          currentUser,
          trx,
        })
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import zlyhal.'
      return response.badRequest({ message })
    }

    await writeAuditLog({
      action: 'competition.import.performed',
      userId: currentUser.id,
      competitionId: competition.id,
      entityType: 'competition',
      entityId: competition.id,
      payload: { keys: Object.keys(data ?? {}) },
    })

    return response.ok({ message: 'Import successful' })
  }
}
