import { describe, expect, it } from 'vitest'
import { isSharp, ledgerLines, stepsFromBottomLine, transposeStaffNote, type NoteDuration, type StaffNote } from './staff'

function note(name: StaffNote['note'], octave: number, duration: NoteDuration = 'quarter'): StaffNote {
  return { note: name, octave, duration }
}

describe('stepsFromBottomLine', () => {
  it('places the treble-clef lines EGBDF at even steps 0..8', () => {
    expect(stepsFromBottomLine(note('E', 4))).toBe(0)
    expect(stepsFromBottomLine(note('G', 4))).toBe(2)
    expect(stepsFromBottomLine(note('B', 4))).toBe(4)
    expect(stepsFromBottomLine(note('D', 5))).toBe(6)
    expect(stepsFromBottomLine(note('F', 5))).toBe(8)
  })

  it('places the spaces FACE at odd steps 1..7', () => {
    expect(stepsFromBottomLine(note('F', 4))).toBe(1)
    expect(stepsFromBottomLine(note('A', 4))).toBe(3)
    expect(stepsFromBottomLine(note('C', 5))).toBe(5)
    expect(stepsFromBottomLine(note('E', 5))).toBe(7)
  })

  it('shares a row for a natural and its sharp', () => {
    expect(stepsFromBottomLine(note('F', 4))).toBe(stepsFromBottomLine(note('F#', 4)))
  })
})

describe('ledgerLines', () => {
  it('needs none for notes on the staff', () => {
    expect(ledgerLines(note('E', 4))).toEqual([])
    expect(ledgerLines(note('F', 5))).toEqual([])
    expect(ledgerLines(note('C', 5))).toEqual([])
  })

  it('draws one ledger line for middle C below the staff', () => {
    expect(ledgerLines(note('C', 4))).toEqual([-2])
  })

  it('does not draw a ledger for a note hanging in the space just below the staff', () => {
    expect(ledgerLines(note('D', 4))).toEqual([])
  })

  it('stacks ledger lines further below the staff', () => {
    expect(ledgerLines(note('B', 3))).toEqual([-2])
    expect(ledgerLines(note('A', 3))).toEqual([-2, -4])
  })

  it('draws ledger lines above the staff', () => {
    expect(ledgerLines(note('G', 5))).toEqual([])
    expect(ledgerLines(note('A', 5))).toEqual([10])
    expect(ledgerLines(note('C', 6))).toEqual([10, 12])
  })
})

describe('isSharp', () => {
  it('detects accidentals', () => {
    expect(isSharp(note('F#', 4))).toBe(true)
    expect(isSharp(note('F', 4))).toBe(false)
  })
})

describe('transposeStaffNote', () => {
  it('shifts within an octave', () => {
    expect(transposeStaffNote(note('C', 4), 2)).toMatchObject({ note: 'D', octave: 4 })
    expect(transposeStaffNote(note('C', 4), 4)).toMatchObject({ note: 'E', octave: 4 })
  })

  it('carries the octave up across B->C', () => {
    expect(transposeStaffNote(note('B', 4), 1)).toMatchObject({ note: 'C', octave: 5 })
  })

  it('carries the octave down across C->B', () => {
    expect(transposeStaffNote(note('C', 4), -1)).toMatchObject({ note: 'B', octave: 3 })
  })

  it('preserves duration', () => {
    expect(transposeStaffNote(note('E', 4, 'half'), 3).duration).toBe('half')
  })
})
