import type { StrumDifficulty } from './strumPatterns'

export interface ChordProgression {
  id: string
  name: string
  key: string
  /** Roman numeral of each bar's chord in the key, one per bar. */
  numerals: string[]
  /** One chordVoicings id per bar. */
  bars: string[]
  /** Starting tempo, in beats per minute. */
  tempo: number
  patternId: string
  difficulty: StrumDifficulty
}

/** A progression run plays the bars twice, so the change back to the top gets practised too. */
export const PROGRESSION_REPEATS = 2

export const CHORD_PROGRESSIONS: ChordProgression[] = [
  {
    id: 'pop-g',
    name: 'I-V-vi-IV in G',
    key: 'G',
    numerals: ['I', 'V', 'vi', 'IV'],
    bars: ['g-major-open', 'd-major-open', 'e-minor-open', 'c-major-open'],
    tempo: 70,
    patternId: 'eighths',
    difficulty: 'easy',
  },
  {
    id: 'minor-pop-g',
    name: 'vi-IV-I-V in G',
    key: 'G',
    numerals: ['vi', 'IV', 'I', 'V'],
    bars: ['e-minor-open', 'c-major-open', 'g-major-open', 'd-major-open'],
    tempo: 80,
    patternId: 'island',
    difficulty: 'easy',
  },
  {
    id: 'fifties-c',
    name: 'I-vi-IV-V in C',
    key: 'C',
    numerals: ['I', 'vi', 'IVmaj7', 'V'],
    bars: ['c-major-open', 'a-minor-open', 'fmaj7-open', 'g-major-open'],
    tempo: 75,
    patternId: 'down-down-up',
    difficulty: 'medium',
  },
  {
    id: 'three-chord-a',
    name: 'I-IV-V in A',
    key: 'A',
    numerals: ['I', 'IV', 'I', 'V'],
    bars: ['a-major-open', 'd-major-open', 'a-major-open', 'e-major-open'],
    tempo: 90,
    patternId: 'down-down-up',
    difficulty: 'easy',
  },
  {
    id: 'twelve-bar-a',
    name: '12-bar blues in A',
    key: 'A',
    numerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    bars: [
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
    ],
    tempo: 90,
    patternId: 'shuffle',
    difficulty: 'medium',
  },
  {
    id: 'two-five-one-c',
    name: 'ii-V-I in C',
    key: 'C',
    numerals: ['ii7', 'V7', 'Imaj7', 'Imaj7'],
    bars: ['dm7-open', 'g7-open', 'cmaj7-open', 'cmaj7-open'],
    tempo: 90,
    patternId: 'quarters',
    difficulty: 'hard',
  },
  {
    id: 'andalusian-am',
    name: 'Andalusian cadence in Am',
    key: 'Am',
    numerals: ['i', 'VII', 'VImaj7', 'V'],
    bars: ['a-minor-open', 'g-major-open', 'fmaj7-open', 'e-major-open'],
    tempo: 80,
    patternId: 'eighths',
    difficulty: 'medium',
  },
  {
    id: 'sus-d',
    name: 'Sus decorations on D',
    key: 'D',
    numerals: ['I', 'Isus4', 'I', 'Isus2'],
    bars: ['d-major-open', 'dsus4-open', 'd-major-open', 'dsus2-open'],
    tempo: 70,
    patternId: 'eighths',
    difficulty: 'easy',
  },
  {
    id: 'g-cadd9-d-em',
    name: 'G-Cadd9-D-Em',
    key: 'G',
    numerals: ['I', 'IVadd9', 'V', 'vi'],
    bars: ['g-major-open', 'cadd9-open', 'd-major-open', 'e-minor-open'],
    tempo: 85,
    patternId: 'island',
    difficulty: 'medium',
  },
  {
    id: 'turnaround-e',
    name: 'Blues turnaround in E',
    key: 'E',
    numerals: ['V7', 'IV7', 'I7', 'V7'],
    bars: ['b7-open', 'a7-open', 'e7-open', 'b7-open'],
    tempo: 80,
    patternId: 'shuffle',
    difficulty: 'hard',
  },
]

export function progressionById(id: string): ChordProgression | undefined {
  return CHORD_PROGRESSIONS.find((p) => p.id === id)
}

export interface ChordChange {
  voicingId: string
  inBeats: number
}

export interface TimelineBeat {
  /** Bar number from the start of the run, counting through repeats. */
  bar: number
  beat: number
  voicingId: string
  /** The next chord that differs from this one, so the change can be prepared; null when none follows. */
  nextChange: ChordChange | null
}

/** One entry per beat of the run, each carrying its chord and the next change coming up. */
export function expandBars(bars: string[], beatsPerBar: number, repeats = 1): TimelineBeat[] {
  const chords = Array.from({ length: repeats }, () => bars).flat()
  const beats = chords.flatMap((voicingId) => Array.from({ length: beatsPerBar }, () => voicingId))
  const timeline: TimelineBeat[] = []
  let nextChange: ChordChange | null = null
  for (let index = beats.length - 1; index >= 0; index -= 1) {
    const following = beats[index + 1]
    if (following !== undefined && following !== beats[index]) {
      nextChange = { voicingId: following, inBeats: 1 }
    } else if (nextChange !== null) {
      nextChange = { voicingId: nextChange.voicingId, inBeats: nextChange.inBeats + 1 }
    }
    timeline[index] = {
      bar: Math.floor(index / beatsPerBar),
      beat: index % beatsPerBar,
      voicingId: beats[index],
      nextChange,
    }
  }
  return timeline
}
