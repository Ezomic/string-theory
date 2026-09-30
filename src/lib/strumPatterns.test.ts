import { describe, expect, it } from 'vitest'
import {
  STRUM_DIFFICULTIES,
  STRUM_PATTERNS,
  countLabels,
  isValidPattern,
  patternById,
  slotCount,
  type StrumPattern,
} from './strumPatterns'

const straightEighths: StrumPattern = {
  id: 'test',
  name: 'Test',
  difficulty: 'easy',
  tempo: 80,
  beatsPerBar: 4,
  subdivision: 2,
  slots: ['down', 'up', 'down', 'up', 'down', 'up', 'down', 'up'],
}

describe('countLabels', () => {
  it('counts straight eighths as 1 & 2 &', () => {
    expect(countLabels(2, 4)).toEqual(['1', '&', '2', '&', '3', '&', '4', '&'])
  })

  it('counts triplets as 1 & a', () => {
    expect(countLabels(3, 2)).toEqual(['1', '&', 'a', '2', '&', 'a'])
  })

  it('counts sixteenths as 1 e & a', () => {
    expect(countLabels(4, 2)).toEqual(['1', 'e', '&', 'a', '2', 'e', '&', 'a'])
  })

  it('follows the bar length, so 3/4 counts to three', () => {
    expect(countLabels(2, 3)).toEqual(['1', '&', '2', '&', '3', '&'])
  })
})

describe('slotCount', () => {
  it('is beats per bar times the subdivision', () => {
    expect(slotCount({ beatsPerBar: 4, subdivision: 2 })).toBe(8)
    expect(slotCount({ beatsPerBar: 4, subdivision: 3 })).toBe(12)
    expect(slotCount({ beatsPerBar: 4, subdivision: 4 })).toBe(16)
    expect(slotCount({ beatsPerBar: 3, subdivision: 2 })).toBe(6)
  })
})

describe('isValidPattern', () => {
  it('accepts a well-formed pattern', () => {
    expect(isValidPattern(straightEighths)).toBe(true)
  })

  it('rejects a slot grid that does not fill the bar exactly', () => {
    expect(isValidPattern({ ...straightEighths, slots: straightEighths.slots.slice(1) })).toBe(false)
    expect(isValidPattern({ ...straightEighths, slots: [...straightEighths.slots, 'down'] })).toBe(false)
  })

  it('rejects a bar with nothing to play', () => {
    expect(isValidPattern({ ...straightEighths, slots: Array(8).fill('rest') })).toBe(false)
  })

  it('rejects an up-stroke on the beat or a down-stroke off it in straight time', () => {
    expect(isValidPattern({ ...straightEighths, slots: ['up', 'down', 'down', 'up', 'down', 'up', 'down', 'up'] })).toBe(
      false,
    )
    expect(
      isValidPattern({
        ...straightEighths,
        subdivision: 4,
        beatsPerBar: 2,
        slots: ['down', 'down', 'down', 'up', 'down', 'up', 'down', 'up'],
      }),
    ).toBe(false)
  })

  it('allows a muted chuck on or off the beat', () => {
    expect(isValidPattern({ ...straightEighths, slots: ['down', 'mute', 'mute', 'up', 'down', 'up', 'down', 'up'] })).toBe(
      true,
    )
  })

  it('rejects an unsupported bar length or subdivision', () => {
    expect(isValidPattern({ ...straightEighths, beatsPerBar: 0, slots: [] })).toBe(false)
    expect(isValidPattern({ ...straightEighths, subdivision: 5 as StrumPattern['subdivision'] })).toBe(false)
  })
})

describe('STRUM_PATTERNS', () => {
  it('has unique ids', () => {
    const ids = STRUM_PATTERNS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ships only valid patterns with a name, tempo and difficulty', () => {
    STRUM_PATTERNS.forEach((pattern) => {
      expect(isValidPattern(pattern), pattern.id).toBe(true)
      expect(pattern.name.length).toBeGreaterThan(0)
      expect(pattern.tempo).toBeGreaterThan(0)
      expect(STRUM_DIFFICULTIES).toContain(pattern.difficulty)
    })
  })

  it('covers eighths, shuffle triplets and 16ths, with mutes and a bar of 3/4', () => {
    expect(STRUM_PATTERNS.length).toBeGreaterThanOrEqual(8)
    expect(STRUM_PATTERNS.some((p) => p.subdivision === 2)).toBe(true)
    expect(STRUM_PATTERNS.some((p) => p.subdivision === 3)).toBe(true)
    expect(STRUM_PATTERNS.some((p) => p.subdivision === 4 && p.slots.includes('mute'))).toBe(true)
    expect(STRUM_PATTERNS.some((p) => p.beatsPerBar === 3)).toBe(true)
  })

  it('runs from easy to hard', () => {
    STRUM_DIFFICULTIES.forEach((difficulty) => {
      expect(STRUM_PATTERNS.some((p) => p.difficulty === difficulty)).toBe(true)
    })
  })

  it('finds a pattern by id', () => {
    expect(patternById(STRUM_PATTERNS[0].id)).toBe(STRUM_PATTERNS[0])
    expect(patternById('nope')).toBeUndefined()
  })
})
