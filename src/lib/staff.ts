import { NOTE_NAMES, type NoteName } from './pitch/noteMath'

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth'

export interface StaffNote {
  /** Chromatic note name; the letter drives the staff row, an accidental is drawn separately. */
  note: NoteName
  /** Scientific-pitch octave (middle C is C4). */
  octave: number
  duration: NoteDuration
}

/** Diatonic (letter-based) offset within an octave: C=0 … B=6. */
const LETTER_STEP: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }

/** A treble staff spans E4 (bottom line) to F5 (top line); positions are measured from the bottom line. */
const BOTTOM_LINE_INDEX = 4 * 7 + LETTER_STEP.E // E4
const TOP_LINE_STEP = 8 // F5 sits 8 diatonic half-steps above the bottom line

/** Whole-tone-agnostic index used to order notes vertically on the staff (accidentals share a row). */
export function diatonicIndex(note: StaffNote): number {
  return note.octave * 7 + LETTER_STEP[note.note[0]]
}

/**
 * Vertical position as diatonic half-steps above the bottom staff line (E4).
 * Each unit is half a line gap: 0 = bottom line, 1 = first space, 8 = top line.
 */
export function stepsFromBottomLine(note: StaffNote): number {
  return diatonicIndex(note) - BOTTOM_LINE_INDEX
}

export function isSharp(note: StaffNote): boolean {
  return note.note.includes('#')
}

/** Shift a staff note by a number of semitones, carrying the octave across octave boundaries. */
export function transposeStaffNote(note: StaffNote, semitones: number): StaffNote {
  const chromatic = note.octave * 12 + NOTE_NAMES.indexOf(note.note) + semitones
  return {
    ...note,
    note: NOTE_NAMES[((chromatic % 12) + 12) % 12],
    octave: Math.floor(chromatic / 12),
  }
}

/**
 * Ledger-line step positions for a note sitting outside the five staff lines.
 * Below the staff they fall at −2, −4, …; above it at 10, 12, …; notes within a
 * single step of the staff (spaces just outside it) need none.
 */
export function ledgerLines(note: StaffNote): number[] {
  const step = stepsFromBottomLine(note)
  const lines: number[] = []
  if (step < 0) {
    for (let k = -2; k >= step; k -= 2) lines.push(k)
  } else if (step > TOP_LINE_STEP) {
    for (let k = TOP_LINE_STEP + 2; k <= step; k += 2) lines.push(k)
  }
  return lines
}
