import { describe, expect, it } from 'vitest'
import {
  generateQuestion,
  levelFromCorrectCount,
  levelProgressFromCorrectCount,
  statsForCategory,
} from './earTraining'
import type { DrillResult } from './db/types'

describe('generateQuestion', () => {
  it('always includes the correct answer among the choices', () => {
    for (let i = 0; i < 50; i += 1) {
      const question = generateQuestion('intervals', 3)
      expect(question.choices).toContain(question.correctLabel)
    }
  })

  it('never repeats a choice label', () => {
    for (let i = 0; i < 50; i += 1) {
      const question = generateQuestion('chordQuality', 3)
      expect(new Set(question.choices).size).toBe(question.choices.length)
    }
  })

  it('generates exactly two frequencies for an interval question', () => {
    const question = generateQuestion('intervals', 2)
    expect(question.frequencies).toHaveLength(2)
    expect(question.frequencies[1]).toBeGreaterThan(question.frequencies[0])
  })

  it('generates three or more frequencies for a chord question', () => {
    const question = generateQuestion('chordQuality', 3)
    expect(question.frequencies.length).toBeGreaterThanOrEqual(3)
  })

  it('generates seven frequencies for a scale-recognition question', () => {
    const question = generateQuestion('scaleRecognition', 1)
    expect(question.frequencies).toHaveLength(7)
  })

  it('offers only two choices for scale recognition at level 1 (major vs minor)', () => {
    const question = generateQuestion('scaleRecognition', 1)
    expect(question.choices).toHaveLength(2)
    expect(question.choices.sort()).toEqual(['Major', 'Minor'])
  })

  it('unlocks major/minor pentatonic recognition from level 2 onward', () => {
    const seenLabels = new Set<string>()
    for (let i = 0; i < 100; i += 1) {
      seenLabels.add(generateQuestion('scaleRecognition', 2).correctLabel)
    }
    expect(seenLabels).toEqual(new Set(['Major', 'Minor', 'Major pentatonic', 'Minor pentatonic']))
  })

  it('generates five frequencies for a pentatonic scale-recognition question', () => {
    for (let i = 0; i < 50; i += 1) {
      const question = generateQuestion('scaleRecognition', 2)
      if (question.correctLabel.includes('pentatonic')) {
        expect(question.frequencies).toHaveLength(5)
        return
      }
    }
    throw new Error('never generated a pentatonic question in 50 tries')
  })

  it('restricts chord quality to major/minor at level 1', () => {
    for (let i = 0; i < 30; i += 1) {
      const question = generateQuestion('chordQuality', 1)
      expect(['Major', 'Minor']).toContain(question.correctLabel)
    }
  })

  it('unlocks modal scale recognition (dorian/mixolydian/phrygian) at level 3, not the exotic ones yet', () => {
    const seenLabels = new Set<string>()
    for (let i = 0; i < 150; i += 1) {
      seenLabels.add(generateQuestion('scaleRecognition', 3).correctLabel)
    }
    expect(seenLabels).toEqual(
      new Set(['Major', 'Minor', 'Major pentatonic', 'Minor pentatonic', 'Dorian', 'Mixolydian', 'Phrygian']),
    )
  })

  it('unlocks harmonic/melodic minor, lydian, and locrian recognition at the max level', () => {
    const seenLabels = new Set<string>()
    for (let i = 0; i < 300; i += 1) {
      seenLabels.add(generateQuestion('scaleRecognition', 4).correctLabel)
    }
    expect(seenLabels.has('Harmonic minor')).toBe(true)
    expect(seenLabels.has('Lydian')).toBe(true)
    expect(seenLabels.has('Locrian')).toBe(true)
    expect(seenLabels.has('Melodic minor')).toBe(true)
  })

  it('keeps chord quality at major/minor/dim/aug/7ths through level 3, not the sus/dim7/m7b5 chords yet', () => {
    const seenLabels = new Set<string>()
    for (let i = 0; i < 150; i += 1) {
      seenLabels.add(generateQuestion('chordQuality', 3).correctLabel)
    }
    expect(seenLabels).toEqual(new Set(['Major', 'Minor', 'Diminished', 'Augmented', '7', 'maj7', 'm7']))
  })

  it('unlocks sus2/sus4/dim7/m7♭5 chord-quality recognition at the max level', () => {
    const seenLabels = new Set<string>()
    for (let i = 0; i < 300; i += 1) {
      seenLabels.add(generateQuestion('chordQuality', 4).correctLabel)
    }
    expect(seenLabels.has('sus2')).toBe(true)
    expect(seenLabels.has('sus4')).toBe(true)
    expect(seenLabels.has('dim7')).toBe(true)
    expect(seenLabels.has('m7♭5')).toBe(true)
  })

  it('plays intervals melodic-then-harmonic, chords harmonic, and scales melodic', () => {
    expect(generateQuestion('intervals', 1).playbackKind).toBe('melodicThenHarmonic')
    expect(generateQuestion('chordQuality', 1).playbackKind).toBe('harmonic')
    expect(generateQuestion('scaleRecognition', 1).playbackKind).toBe('melodic')
  })

  it('generates a real chord progression, not a fallback interval question', () => {
    for (let i = 0; i < 30; i += 1) {
      const question = generateQuestion('progressions', 3)
      expect(question.category).toBe('progressions')
      expect(question.playbackKind).toBe('progression')
      expect(question.chordFrequencyGroups).toBeDefined()
      expect(question.chordFrequencyGroups!.length).toBeGreaterThanOrEqual(3)
      question.chordFrequencyGroups!.forEach((chord) => expect(chord.length).toBeGreaterThanOrEqual(3))
      expect(question.choices).toContain(question.correctLabel)
    }
  })

  it('restricts progressions to the two most common ones at low level', () => {
    for (let i = 0; i < 30; i += 1) {
      const question = generateQuestion('progressions', 1)
      expect(['I – IV – V – I', 'I – V – vi – IV']).toContain(question.correctLabel)
    }
  })

  it('unlocks the jazz/minor progressions at higher level', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 60; i += 1) {
      seen.add(generateQuestion('progressions', 4).correctLabel)
    }
    expect(seen.has('ii – V – I') || seen.has('vi – IV – I – V')).toBe(true)
  })

  it('unlocks minor-key progressions at the max level', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i += 1) {
      seen.add(generateQuestion('progressions', 4).correctLabel)
    }
    expect(seen.has('i – iv – v – i')).toBe(true)
    expect(seen.has('i – VI – III – VII')).toBe(true)
    expect(seen.has('i – iv – VII – III')).toBe(true)
    expect(seen.has('ii° – v – i')).toBe(true)
  })

  it('flattens the chord groups into the top-level frequencies field too', () => {
    const question = generateQuestion('progressions', 3)
    const flatLength = question.chordFrequencyGroups!.reduce((sum, group) => sum + group.length, 0)
    expect(question.frequencies).toHaveLength(flatLength)
  })
})

describe('statsForCategory', () => {
  function result(overrides: Partial<DrillResult>): DrillResult {
    return {
      id: 'x',
      type: 'intervals',
      level: 1,
      correct: 1,
      total: 1,
      streak: 0,
      timestamp: '2026-01-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('returns zero accuracy and level 1 with no attempts', () => {
    expect(statsForCategory([], 'intervals')).toEqual({
      level: 1,
      accuracyPct: 0,
      attempts: 0,
      correctCount: 0,
    })
  })

  it('only counts results matching the category', () => {
    const results = [
      result({ type: 'intervals', correct: 1, total: 1 }),
      result({ type: 'chordQuality', correct: 0, total: 1 }),
    ]
    expect(statsForCategory(results, 'intervals')).toEqual({
      level: 1,
      accuracyPct: 100,
      attempts: 1,
      correctCount: 1,
    })
  })

  it('computes accuracy percentage and derives level from correct count', () => {
    const results = Array.from({ length: 10 }, () => result({ correct: 1, total: 1 }))
    expect(statsForCategory(results, 'intervals')).toEqual({
      level: 3,
      accuracyPct: 100,
      attempts: 10,
      correctCount: 10,
    })
  })
})

describe('levelProgressFromCorrectCount', () => {
  it('awards 10 XP per correct answer', () => {
    expect(levelProgressFromCorrectCount(3).xp).toBe(30)
    expect(levelProgressFromCorrectCount(0).xp).toBe(0)
  })

  it('reports correct answers remaining to the next level', () => {
    expect(levelProgressFromCorrectCount(0).correctToNextLevel).toBe(5)
    expect(levelProgressFromCorrectCount(3).correctToNextLevel).toBe(2)
    expect(levelProgressFromCorrectCount(5).correctToNextLevel).toBe(5)
  })

  it('reports null correctToNextLevel and 100% progress at the max level', () => {
    const progress = levelProgressFromCorrectCount(15)
    expect(progress.level).toBe(4)
    expect(progress.correctToNextLevel).toBeNull()
    expect(progress.progressPct).toBe(100)

    const wellPastMax = levelProgressFromCorrectCount(50)
    expect(wellPastMax.level).toBe(4)
    expect(wellPastMax.correctToNextLevel).toBeNull()
  })

  it('computes progress percentage within the current level band', () => {
    // Level 2 spans correct counts 5-9; 7 correct is 2/5 of the way through.
    expect(levelProgressFromCorrectCount(7).progressPct).toBe(40)
  })
})

describe('levelFromCorrectCount', () => {
  it('starts at level 1', () => {
    expect(levelFromCorrectCount(0)).toBe(1)
    expect(levelFromCorrectCount(4)).toBe(1)
  })

  it('steps up every 5 correct answers, capped at 4', () => {
    expect(levelFromCorrectCount(5)).toBe(2)
    expect(levelFromCorrectCount(10)).toBe(3)
    expect(levelFromCorrectCount(15)).toBe(4)
    expect(levelFromCorrectCount(100)).toBe(4)
  })
})
