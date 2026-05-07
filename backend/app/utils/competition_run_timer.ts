import { DateTime } from 'luxon'
import type Competition from '#models/competition'

type RunStatus = 'active' | 'paused' | 'finished' | 'scheduled'

function bankActiveSegmentIfRunning(
  competition: Pick<Competition, 'accumulatedActiveMs' | 'activeSegmentStartedAt'>
) {
  if (competition.activeSegmentStartedAt) {
    const ms = DateTime.now()
      .diff(competition.activeSegmentStartedAt, 'milliseconds')
      .as('milliseconds')
    competition.accumulatedActiveMs += Math.max(0, Math.floor(ms))
    competition.activeSegmentStartedAt = null
  }
}

/** Upraví run timer pri zmene stavu súťaže; volajte pred `save()`. */
export function applyRunTimerAfterStatusChange(
  competition: Pick<Competition, 'accumulatedActiveMs' | 'activeSegmentStartedAt' | 'status'>,
  oldStatus: RunStatus,
  newStatus: RunStatus
) {
  if (oldStatus === newStatus) return

  if (oldStatus === 'active') {
    bankActiveSegmentIfRunning(competition)
  }

  if (newStatus === 'active') {
    if (oldStatus === 'scheduled') {
      competition.accumulatedActiveMs = 0
    }
    competition.activeSegmentStartedAt = DateTime.now()
  } else {
    competition.activeSegmentStartedAt = null
    if (newStatus === 'scheduled') {
      competition.accumulatedActiveMs = 0
    }
  }
}

export function initializeRunTimerForNewCompetition(
  competition: Pick<Competition, 'accumulatedActiveMs' | 'activeSegmentStartedAt' | 'status'>
) {
  competition.accumulatedActiveMs = 0
  if (competition.status === 'active') {
    competition.activeSegmentStartedAt = DateTime.now()
  } else {
    competition.activeSegmentStartedAt = null
  }
}

function getRunTimerElapsedMs(
  competition: Pick<Competition, 'accumulatedActiveMs' | 'activeSegmentStartedAt' | 'status'>
): number {
  let t = competition.accumulatedActiveMs
  if (competition.status === 'active' && competition.activeSegmentStartedAt) {
    t += Math.max(
      0,
      Math.floor(
        DateTime.now().diff(competition.activeSegmentStartedAt, 'milliseconds').as('milliseconds')
      )
    )
  }
  return t
}

function isRunTimerClockRunning(
  competition: Pick<Competition, 'activeSegmentStartedAt' | 'status'>
): boolean {
  return competition.status === 'active' && competition.activeSegmentStartedAt !== null
}

export function buildRunTimerPayload(competition: Competition) {
  return {
    status: competition.status,
    elapsedMs: getRunTimerElapsedMs(competition),
    isRunning: isRunTimerClockRunning(competition),
    serverNow: DateTime.now().toISO(),
  }
}
