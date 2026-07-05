import { describe, expect, it } from 'vitest'
import { buildSkillsList, isProgressEmpty } from './progress'

describe('buildSkillsList', () => {
  it('includes SkillProgress-backed skills', () => {
    const list = buildSkillsList([{ skillKey: 'fretboardNotes', masteryPct: 74 }], [])
    expect(list).toEqual([{ key: 'fretboardNotes', label: 'Fretboard notes', masteryPct: 74, route: '/tools/fretboard/quiz' }])
  })

  it('derives ear-drill skills from DrillResult accuracy, only when attempted', () => {
    const list = buildSkillsList(
      [],
      [
        { id: '1', type: 'intervals', level: 3, correct: 9, total: 10, streak: 2, timestamp: 't' },
        { id: '2', type: 'chordQuality', level: 1, correct: 0, total: 0, streak: 0, timestamp: 't' },
      ],
    )
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ key: 'intervals', masteryPct: 90 })
  })

  it('sorts by masteryPct descending', () => {
    const list = buildSkillsList(
      [
        { skillKey: 'fretboardNotes', masteryPct: 20 },
        { skillKey: 'play', masteryPct: 80 },
      ],
      [],
    )
    expect(list.map((s) => s.key)).toEqual(['play', 'fretboardNotes'])
  })

  it('ignores unknown skill keys', () => {
    const list = buildSkillsList([{ skillKey: 'mystery', masteryPct: 50 }], [])
    expect(list).toHaveLength(0)
  })
})

describe('isProgressEmpty', () => {
  it('is true with no sessions', () => {
    expect(isProgressEmpty([])).toBe(true)
  })

  it('is false with at least one session', () => {
    expect(isProgressEmpty([{ date: '2026-01-01', minutes: 1, activities: ['lesson'] }])).toBe(false)
  })
})
