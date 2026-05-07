/** Synchronizované údaje behu času z API live endpoints. */
export type RunTimerPayload = {
  status: 'active' | 'paused' | 'finished' | 'scheduled'
  elapsedMs: number
  isRunning: boolean
  serverNow: string
}

const STAV: Record<string, string> = {
  scheduled: 'Ešte nezačala',
  active: 'Prebieha',
  paused: 'Pozastavená',
  finished: 'Ukončená',
}

export function stavSutazeText(status: string | undefined): string {
  if (status == null) return '—'
  return STAV[status] ?? status
}

/** Efektívne uplynuté ms (pri behu klient dorátava skew voči serveru). */
export function currentElapsedMs(rt: RunTimerPayload): number {
  if (rt.status === 'scheduled') return 0
  if (rt.isRunning) {
    const serverTs = new Date(rt.serverNow).getTime()
    const skew = Date.now() - serverTs
    return Math.max(0, rt.elapsedMs + skew)
  }
  return Math.max(0, rt.elapsedMs)
}

export function formatStopwatchShort(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
