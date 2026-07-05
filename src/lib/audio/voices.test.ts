import { describe, expect, it } from 'vitest'
import { VOICES } from './voices'

describe('VOICES', () => {
  it('offers exactly 10 distinct voices', () => {
    expect(VOICES).toHaveLength(10)
    expect(new Set(VOICES.map((v) => v.id)).size).toBe(10)
  })

  it('gives every voice a non-empty label and description', () => {
    VOICES.forEach((voice) => {
      expect(voice.label.length).toBeGreaterThan(0)
      expect(voice.description.length).toBeGreaterThan(0)
    })
  })
})
