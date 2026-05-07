import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#models/user'

type JudgeImportRow = {
  name?: string
  userId?: number
  email?: string
  phone?: string
}

type ExhibitorImportRow = {
  name?: string
  userId?: number
  email?: string
  phone?: string
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toLowerCase()
  return t.length ? t : null
}

/** Trim + odstránenie bežných medzier v čísle (hodnota v DB musí byť unikátna). */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().replace(/\s+/g, '')
  return t.length ? t : null
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Nájde používateľa podľa e-mailu alebo telefónu (pre import — pred INSERT, aby trx nezlyhala na unique). */
export async function findExistingUserForImport(
  email: string | null,
  phone: string | null,
  client?: TransactionClientContract
): Promise<User | null> {
  const clientOpts = client ? { client } : undefined

  if (email) {
    const u = await User.query(clientOpts).whereRaw('lower(trim(email)) = ?', [email]).first()
    if (u) return u
  }

  if (phone) {
    let u = await User.query(clientOpts).where('phone', phone).first()
    if (!u && digitsOnly(phone).length >= 5) {
      u = await User.query(clientOpts)
        .whereRaw(`regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ?`, [digitsOnly(phone)])
        .first()
    }
    if (u) return u
  }

  return null
}

export async function resolveUserIdForImport(
  row: JudgeImportRow | ExhibitorImportRow,
  label: string,
  client?: TransactionClientContract
): Promise<number> {
  const clientOpts = client ? { client } : undefined

  const email = normalizeEmail(row.email)
  if (email) {
    const u = await User.query(clientOpts).whereRaw('lower(trim(email)) = ?', [email]).first()
    if (u) return u.id
  }

  const phone = normalizePhone(row.phone)
  if (phone) {
    let u = await User.query(clientOpts).where('phone', phone).first()
    if (!u && digitsOnly(phone).length >= 5) {
      u = await User.query(clientOpts)
        .whereRaw(`regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ?`, [digitsOnly(phone)])
        .first()
    }
    if (u) return u.id
  }

  if (email || phone) {
    throw new Error(
      `${label}: podľa e-mailu alebo telefónu sa nenašiel používateľ. Buď už existuje v systéme, alebo ho v tom istom importe najprv vytvorte v poli "users" (rovnaký e-mail/telefón ako pri rozhodcovi/vystavovateľovi).`
    )
  }

  throw new Error(
    `${label}: zadajte e-mail alebo telefón zhodný s existujúcim účtom alebo s položkou v poli "users" v tom istom JSON súbore.`
  )
}
