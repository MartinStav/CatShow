/** Paleta Quasar farieb — cyklus podľa `sortOrder` (poradie v taxonómii). */
const PALETTE = [
  'primary',
  'secondary',
  'accent',
  'positive',
  'info',
  'warning',
  'deep-orange',
  'purple',
  'teal',
  'pink',
  'indigo',
  'deep-purple',
] as const

/** Farba badge podľa poľa Poradie (`sortOrder`) v grades / titles / classes. */
export function quasarColorBySortOrder(sortOrder: number): string {
  const n = Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 0
  const i = ((n % PALETTE.length) + PALETTE.length) % PALETTE.length
  return PALETTE[i]!
}
