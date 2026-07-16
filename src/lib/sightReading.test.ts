import { describe, expect, it } from 'vitest'
import type { SightReadingRun } from './db/types'
import { mulberry32 } from './shuffle'
import {
  correctCountFromRuns,
  generateSightReadingQuestion,
  phraseLength,
  pitchPoolForLevel,
  sightReadingProgress,
} from './sightReading'

describe('pitchPoolForLevel', () => {
  it('starts with the on-staff naturals and grows each level', () => {
    const l1 = pitchPoolForLevel(1)
    expect(l1.every((p) => !p.note.includes('#'))).toBe(true)
    expect(pitchPoolForLevel(2).length).toBeGreaterThan(l1.length)
    expect(pitchPoolForLevel(3).length).toBeGreaterThan(pitchPoolForLevel(2).length)
  })

  it('only introduces accidentals at level 4', () => {
    expect(pitchPoolForLevel(3).some((p) => p.note.includes('#'))).toBe(false)
    expect(pitchPoolForLevel(4).some((p) => p.note.includes('#'))).toBe(true)
  })
})

describe('phraseLength', () => {
  it('keeps name mode to a single note', () => {
    expect(phraseLength('name', 4)).toBe(1)
  })

  it('grows play-mode phrases with level, capped at 3', () => {
    expect(phraseLength('play', 1)).toBe(1)
    expect(phraseLength('play', 2)).toBe(2)
    expect(phraseLength('play', 4)).toBe(3)
  })
})

describe('generateSightReadingQuestion', () => {
  it('is deterministic for a seed and offers the correct answer among unique choices', () => {
    const q = generateSightReadingQuestion('name', 2, mulberry32(7))
    expect(generateSightReadingQuestion('name', 2, mulberry32(7))).toEqual(q)
    expect(q.notes).toHaveLength(1)
    expect(q.choices).toContain(q.correctLabel)
    expect(new Set(q.choices).size).toBe(q.choices.length)
    expect(q.correctLabel).toBe(q.notes[0].note)
  })

  it('builds a multi-note phrase in play mode and mirrors it in expectedNotes', () => {
    const q = generateSightReadingQuestion('play', 3, mulberry32(3))
    expect(q.notes.length).toBeGreaterThan(1)
    expect(q.expectedNotes).toEqual(q.notes.map((n) => n.note))
  })
})

describe('level gating from runs', () => {
  function run(correct: number): SightReadingRun {
    return { id: crypto.randomUUID(), mode: 'name', level: 1, correct, total: 1, timestamp: '2026-01-01' }
  }

  it('counts correct answers and advances level at the thresholds', () => {
    expect(correctCountFromRuns([run(1), run(0), run(1)])).toBe(2)
    expect(sightReadingProgress([]).level).toBe(1)
    expect(sightReadingProgress(Array.from({ length: 5 }, () => run(1))).level).toBe(2)
    expect(sightReadingProgress(Array.from({ length: 15 }, () => run(1))).level).toBe(4)
  })
})
