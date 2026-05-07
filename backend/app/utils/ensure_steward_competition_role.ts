import CompetitionRole from '#models/competition_role'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/** Zabezpečí, že používateľ má v `competition_roles` rolu „steward“ pre danú súťaž. */
export async function ensureStewardCompetitionRole(
  competitionId: number,
  stewardUserId: number | null,
  client?: TransactionClientContract
): Promise<void> {
  if (stewardUserId === null) return
  const opts = client ? { client } : {}
  const existing = await CompetitionRole.query(opts)
    .where('competitionId', competitionId)
    .where('userId', stewardUserId)
    .where('role', 'steward')
    .first()
  if (existing) return
  await CompetitionRole.create({ competitionId, userId: stewardUserId, role: 'steward' }, opts)
}
