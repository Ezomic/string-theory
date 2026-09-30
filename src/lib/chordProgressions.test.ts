import { describe, expect, it } from 'vitest'
import { CHORD_PROGRESSIONS, expandBars, progressionById } from './chordProgressions'
import { voicingById } from './chordVoicings'
import { STRUM_DIFFICULTIES, patternById } from './strumPatterns'

describe('CHORD_PROGRESSIONS', () => {
  it('has the ten progressions with unique ids', () => {
    const ids = CHORD_PROGRESSIONS.map((p) => p.id)
    expect(ids).toHaveLength(10)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names an existing voicing in every bar', () => {
    CHORD_PROGRESSIONS.forEach((progression) => {
      expect(progression.bars.length).toBeGreaterThan(0)
      progression.bars.forEach((voicingId) => {
        expect(voicingById(voicingId), `${progression.id}: ${voicingId}`).toBeDefined()
      })
    })
  })

  it('gives every bar a roman numeral', () => {
    CHORD_PROGRESSIONS.forEach((progression) => {
      expect(progression.numerals, progression.id).toHaveLength(progression.bars.length)
    })
  })

  it('defaults to a strum pattern that exists, at a real tempo', () => {
    CHORD_PROGRESSIONS.forEach((progression) => {
      expect(patternById(progression.patternId), progression.id).toBeDefined()
      expect(progression.tempo).toBeGreaterThan(0)
      expect(progression.key.length).toBeGreaterThan(0)
    })
  })

  it('runs from easy to hard', () => {
    STRUM_DIFFICULTIES.forEach((difficulty) => {
      expect(CHORD_PROGRESSIONS.some((p) => p.difficulty === difficulty)).toBe(true)
    })
  })

  it('plays the 12-bar blues in A on its dominant sevenths', () => {
    const blues = CHORD_PROGRESSIONS.find((p) => p.name === '12-bar blues in A')!
    expect(blues.bars).toEqual([
      'a7-open',
      'a7-open',
      'a7-open',
      'a7-open',
      'd7-open',
      'd7-open',
      'a7-open',
      'a7-open',
      'e7-open',
      'd7-open',
      'a7-open',
      'e7-open',
    ])
  })

  it('finds a progression by id', () => {
    expect(progressionById(CHORD_PROGRESSIONS[0].id)).toBe(CHORD_PROGRESSIONS[0])
    expect(progressionById('nope')).toBeUndefined()
  })
})

describe('expandBars', () => {
  it('gives every beat of every bar its chord', () => {
    const timeline = expandBars(['g', 'd'], 4)
    expect(timeline).toHaveLength(8)
    expect(timeline.map((b) => b.voicingId)).toEqual(['g', 'g', 'g', 'g', 'd', 'd', 'd', 'd'])
    expect(timeline.map((b) => b.bar)).toEqual([0, 0, 0, 0, 1, 1, 1, 1])
    expect(timeline.map((b) => b.beat)).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
  })

  it('follows the bar length, so a 3/4 bar changes chord every three beats', () => {
    const timeline = expandBars(['g', 'd'], 3)
    expect(timeline.map((b) => b.voicingId)).toEqual(['g', 'g', 'g', 'd', 'd', 'd'])
  })

  it('plays the bars again for each repeat, numbering bars straight through', () => {
    const timeline = expandBars(['g', 'd'], 2, 2)
    expect(timeline.map((b) => b.voicingId)).toEqual(['g', 'g', 'd', 'd', 'g', 'g', 'd', 'd'])
    expect(timeline.map((b) => b.bar)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
  })

  it('points each beat at the next chord change and how many beats away it is', () => {
    const timeline = expandBars(['a', 'a', 'd'], 2)
    expect(timeline.map((b) => b.nextChange)).toEqual([
      { voicingId: 'd', inBeats: 4 },
      { voicingId: 'd', inBeats: 3 },
      { voicingId: 'd', inBeats: 2 },
      { voicingId: 'd', inBeats: 1 },
      null,
      null,
    ])
  })

  it('previews the change back to the top of the progression when it repeats', () => {
    const timeline = expandBars(['g', 'd'], 1, 2)
    expect(timeline[1].nextChange).toEqual({ voicingId: 'g', inBeats: 1 })
    expect(timeline[3].nextChange).toBeNull()
  })

  it('has no change to preview when the chord never changes', () => {
    expect(expandBars(['e', 'e'], 4).every((b) => b.nextChange === null)).toBe(true)
  })
})
