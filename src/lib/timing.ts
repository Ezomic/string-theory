const MIN_BEAT_RATIO = 0.35
const MAX_BEAT_RATIO = 3

/**
 * % of note-to-note gaps that land within a generous window around the beat
 * length for `bpm` (guitar playing speed varies a lot note to note, so this
 * is deliberately loose rather than a strict metronome check). The first
 * note has no preceding gap and always counts as on-time.
 */
export function timingPercentage(gapsMs: number[], bpm: number, totalNotes: number): number {
  if (totalNotes === 0) return 0
  const beatMs = 60000 / bpm
  const onTime = gapsMs.filter((gap) => gap >= beatMs * MIN_BEAT_RATIO && gap <= beatMs * MAX_BEAT_RATIO).length
  return Math.round(((onTime + 1) / totalNotes) * 100)
}
