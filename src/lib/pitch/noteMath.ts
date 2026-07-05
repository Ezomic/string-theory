export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export type NoteName = (typeof NOTE_NAMES)[number]

const FLAT_TO_SHARP: Record<string, NoteName> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}

export interface DetectedNote {
  note: NoteName
  octave: number
  cents: number
  midi: number
}

const DEFAULT_REFERENCE_PITCH = 440

function normalizeNoteName(note: string): NoteName {
  const normalized = FLAT_TO_SHARP[note] ?? note
  if (!(NOTE_NAMES as readonly string[]).includes(normalized)) {
    throw new RangeError(`Unknown note name: ${note}`)
  }
  return normalized as NoteName
}

/** Converts a frequency in Hz to the nearest note, octave, and cents deviation. */
export function hzToNote(
  hz: number,
  referencePitch: number = DEFAULT_REFERENCE_PITCH,
): DetectedNote {
  if (hz <= 0) {
    throw new RangeError(`hz must be positive, got ${hz}`)
  }

  const midiFloat = 69 + 12 * Math.log2(hz / referencePitch)
  const midi = Math.round(midiFloat)
  const cents = Math.round((midiFloat - midi) * 100)
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1

  return { note: NOTE_NAMES[noteIndex], octave, cents, midi }
}

/** Converts a note name + octave to its frequency in Hz. */
export function noteToHz(
  note: string,
  octave: number,
  referencePitch: number = DEFAULT_REFERENCE_PITCH,
): number {
  const noteIndex = NOTE_NAMES.indexOf(normalizeNoteName(note))
  const midi = (octave + 1) * 12 + noteIndex
  return referencePitch * Math.pow(2, (midi - 69) / 12)
}

/** Cents deviation of `hz` relative to `targetHz` (positive = sharp, negative = flat). */
export function centsBetween(hz: number, targetHz: number): number {
  if (hz <= 0 || targetHz <= 0) {
    throw new RangeError('hz and targetHz must be positive')
  }
  return 1200 * Math.log2(hz / targetHz)
}

/** The note `semitones` above (or below, if negative) `note`, wrapping across the octave. */
export function transposeNote(note: string, semitones: number): NoteName {
  const index = NOTE_NAMES.indexOf(normalizeNoteName(note))
  const nextIndex = ((index + semitones) % 12 + 12) % 12
  return NOTE_NAMES[nextIndex]
}
