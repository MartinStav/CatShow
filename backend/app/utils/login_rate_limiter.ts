/** In-memory rate limit pre login — 8 zlyhaní za 5 min, lock 15 min. */

const MAX_ATTEMPTS = 8
const WINDOW_MS = 5 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000
const SWEEP_INTERVAL_MS = 60_000

interface BucketState {
  failures: number[]
  lockedUntil: number
}

const buckets = new Map<string, BucketState>()

function pruneOldFailures(state: BucketState, now: number): void {
  state.failures = state.failures.filter((ts) => now - ts <= WINDOW_MS)
}

function bucketKey(identifier: string, ip: string): string {
  return `${identifier.toLowerCase()}|${ip}`
}

let sweepTimer: NodeJS.Timeout | null = null

function startSweeperOnce(): void {
  if (sweepTimer) return
  sweepTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, state] of buckets) {
      pruneOldFailures(state, now)
      if (state.lockedUntil <= now && state.failures.length === 0) {
        buckets.delete(key)
      }
    }
  }, SWEEP_INTERVAL_MS)
  sweepTimer.unref?.()
}

export interface RateLimitCheck {
  allowed: boolean
  retryAfterSeconds: number
}

export function checkLoginAllowed(identifier: string, ip: string): RateLimitCheck {
  const now = Date.now()
  const key = bucketKey(identifier, ip)
  const state = buckets.get(key)
  if (!state) return { allowed: true, retryAfterSeconds: 0 }

  if (state.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
    }
  }

  pruneOldFailures(state, now)
  return { allowed: true, retryAfterSeconds: 0 }
}

export function recordLoginFailure(identifier: string, ip: string): void {
  startSweeperOnce()
  const now = Date.now()
  const key = bucketKey(identifier, ip)
  const state = buckets.get(key) ?? { failures: [], lockedUntil: 0 }
  pruneOldFailures(state, now)
  state.failures.push(now)
  if (state.failures.length >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS
    state.failures = []
  }
  buckets.set(key, state)
}

export function recordLoginSuccess(identifier: string, ip: string): void {
  buckets.delete(bucketKey(identifier, ip))
}
