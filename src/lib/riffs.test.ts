import { describe, expect, it } from 'vitest'
import { RIFF_DIFFICULTIES, RIFFS, riffById, riffsByDifficulty } from './riffs'

describe('RIFFS', () => {
  it('has unique ids', () => {
    const ids = RIFFS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every riff playable notes, a tempo, a difficulty, tags and an instrument', () => {
    RIFFS.forEach((riff) => {
      expect(riff.notes.length).toBeGreaterThan(0)
      expect(riff.tempo).toBeGreaterThan(0)
      expect(RIFF_DIFFICULTIES).toContain(riff.difficulty)
      expect(riff.tags.length).toBeGreaterThan(0)
      expect(['guitar', 'bass']).toContain(riff.instrument)
      expect(riff.title.length).toBeGreaterThan(0)
      expect(riff.artist.length).toBeGreaterThan(0)
    })
  })

  it('covers every difficulty and both instruments', () => {
    RIFF_DIFFICULTIES.forEach((d) => {
      expect(RIFFS.some((r) => r.difficulty === d)).toBe(true)
    })
    expect(RIFFS.some((r) => r.instrument === 'guitar')).toBe(true)
    expect(RIFFS.some((r) => r.instrument === 'bass')).toBe(true)
  })
})

describe('riffById', () => {
  it('finds a known riff', () => {
    expect(riffById('blues-shuffle')?.title).toBe('Blues Shuffle')
  })

  it('returns undefined for an unknown id', () => {
    expect(riffById('nope')).toBeUndefined()
  })
})

describe('riffsByDifficulty', () => {
  it('returns every riff for "all"', () => {
    expect(riffsByDifficulty('all')).toHaveLength(RIFFS.length)
  })

  it('filters to a single difficulty', () => {
    const easy = riffsByDifficulty('easy')
    expect(easy.length).toBeGreaterThan(0)
    expect(easy.every((r) => r.difficulty === 'easy')).toBe(true)
  })
})
