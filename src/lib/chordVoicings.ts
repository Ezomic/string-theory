import type { NoteName } from './pitch/noteMath'
import { CHORDS } from './theory'

export interface ChordBarre {
  fret: number
  /** 1-based string indices (low→high) the barre spans, inclusive. */
  fromString: number
  toString: number
}

export interface ChordVoicing {
  id: string
  name: string
  root: NoteName
  /** Links to a CHORDS catalog id in theory.ts. */
  chordId: string
  /** Lowest fret the diagram window starts at; 1 for open chords. */
  baseFret: number
  /** Per string low→high (6 entries): 0 = open, null = muted, else absolute fret. */
  frets: (number | null)[]
  /** Per string low→high: fretting finger 1-4, or null. */
  fingers: (number | null)[]
  barres?: ChordBarre[]
}

export const CHORD_VOICINGS: ChordVoicing[] = [
  {
    id: 'c-major-open',
    name: 'C major',
    root: 'C',
    chordId: 'major',
    baseFret: 1,
    frets: [null, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
  },
  {
    id: 'a-major-open',
    name: 'A major',
    root: 'A',
    chordId: 'major',
    baseFret: 1,
    frets: [null, 0, 2, 2, 2, 0],
    fingers: [null, null, 1, 2, 3, null],
  },
  {
    id: 'g-major-open',
    name: 'G major',
    root: 'G',
    chordId: 'major',
    baseFret: 1,
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, null, null, null, 3],
  },
  {
    id: 'e-major-open',
    name: 'E major',
    root: 'E',
    chordId: 'major',
    baseFret: 1,
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [null, 2, 3, 1, null, null],
  },
  {
    id: 'd-major-open',
    name: 'D major',
    root: 'D',
    chordId: 'major',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
  },
  {
    id: 'a-minor-open',
    name: 'A minor',
    root: 'A',
    chordId: 'minor',
    baseFret: 1,
    frets: [null, 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
  },
  {
    id: 'e-minor-open',
    name: 'E minor',
    root: 'E',
    chordId: 'minor',
    baseFret: 1,
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
  },
  {
    id: 'd-minor-open',
    name: 'D minor',
    root: 'D',
    chordId: 'minor',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 1],
    fingers: [null, null, null, 2, 3, 1],
  },
  {
    id: 'cmaj7-open',
    name: 'Cmaj7',
    root: 'C',
    chordId: 'maj7',
    baseFret: 1,
    frets: [null, 3, 2, 0, 0, 0],
    fingers: [null, 3, 2, null, null, null],
  },
  {
    id: 'g7-open',
    name: 'G7',
    root: 'G',
    chordId: 'dom7',
    baseFret: 1,
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, null, null, null, 1],
  },
  {
    id: 'a7-open',
    name: 'A7',
    root: 'A',
    chordId: 'dom7',
    baseFret: 1,
    frets: [null, 0, 2, 0, 2, 0],
    fingers: [null, null, 2, null, 3, null],
  },
  {
    id: 'd7-open',
    name: 'D7',
    root: 'D',
    chordId: 'dom7',
    baseFret: 1,
    frets: [null, null, 0, 2, 1, 2],
    fingers: [null, null, null, 2, 1, 3],
  },
  {
    id: 'e7-open',
    name: 'E7',
    root: 'E',
    chordId: 'dom7',
    baseFret: 1,
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [null, 2, null, 1, null, null],
  },
  {
    id: 'b7-open',
    name: 'B7',
    root: 'B',
    chordId: 'dom7',
    baseFret: 1,
    frets: [null, 2, 1, 2, 0, 2],
    fingers: [null, 2, 1, 3, null, 4],
  },
  {
    id: 'am7-open',
    name: 'Am7',
    root: 'A',
    chordId: 'min7',
    baseFret: 1,
    frets: [null, 0, 2, 0, 1, 0],
    fingers: [null, null, 2, null, 1, null],
  },
  {
    id: 'em7-open',
    name: 'Em7',
    root: 'E',
    chordId: 'min7',
    baseFret: 1,
    frets: [0, 2, 2, 0, 3, 0],
    fingers: [null, 1, 2, null, 3, null],
  },
  {
    id: 'dm7-open',
    name: 'Dm7',
    root: 'D',
    chordId: 'min7',
    baseFret: 1,
    frets: [null, null, 0, 2, 1, 1],
    fingers: [null, null, null, 2, 1, 1],
    barres: [{ fret: 1, fromString: 5, toString: 6 }],
  },
  {
    id: 'asus2-open',
    name: 'Asus2',
    root: 'A',
    chordId: 'sus2',
    baseFret: 1,
    frets: [null, 0, 2, 2, 0, 0],
    fingers: [null, null, 2, 3, null, null],
  },
  {
    id: 'asus4-open',
    name: 'Asus4',
    root: 'A',
    chordId: 'sus4',
    baseFret: 1,
    frets: [null, 0, 2, 2, 3, 0],
    fingers: [null, null, 1, 2, 3, null],
  },
  {
    id: 'dsus2-open',
    name: 'Dsus2',
    root: 'D',
    chordId: 'sus2',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 0],
    fingers: [null, null, null, 1, 3, null],
  },
  {
    id: 'dsus4-open',
    name: 'Dsus4',
    root: 'D',
    chordId: 'sus4',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 3],
    fingers: [null, null, null, 1, 3, 4],
  },
  {
    id: 'cadd9-open',
    name: 'Cadd9',
    root: 'C',
    chordId: 'add9',
    baseFret: 1,
    frets: [null, 3, 2, 0, 3, 0],
    fingers: [null, 2, 1, null, 3, null],
  },
  {
    id: 'fmaj7-open',
    name: 'Fmaj7',
    root: 'F',
    chordId: 'maj7',
    baseFret: 1,
    frets: [null, null, 3, 2, 1, 0],
    fingers: [null, null, 3, 2, 1, null],
  },
  {
    id: 'f-major-barre',
    name: 'F major (barre)',
    root: 'F',
    chordId: 'major',
    baseFret: 1,
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barres: [{ fret: 1, fromString: 1, toString: 6 }],
  },
  {
    id: 'b-minor-barre',
    name: 'B minor (barre)',
    root: 'B',
    chordId: 'minor',
    baseFret: 2,
    frets: [null, 2, 4, 4, 3, 2],
    fingers: [null, 1, 3, 4, 2, 1],
    barres: [{ fret: 2, fromString: 2, toString: 6 }],
  },
]

export function voicingById(id: string): ChordVoicing | undefined {
  return CHORD_VOICINGS.find((v) => v.id === id)
}

export function voicingsForChord(chordId: string): ChordVoicing[] {
  return CHORD_VOICINGS.filter((v) => v.chordId === chordId)
}

/** The short chord symbol a player reads off a chart: G, Em, A7, Cadd9. */
export function chordSymbol(voicing: ChordVoicing): string {
  if (voicing.chordId === 'major') return voicing.root
  if (voicing.chordId === 'minor') return `${voicing.root}m`
  const label = CHORDS.find((c) => c.id === voicing.chordId)?.label ?? ''
  return `${voicing.root}${label}`
}

export type VoicingQuality = 'all' | 'major' | 'minor' | 'seventh' | 'sus'

const QUALITY_CHORD_IDS: Record<Exclude<VoicingQuality, 'all'>, string[]> = {
  major: ['major'],
  minor: ['minor'],
  seventh: ['dom7', 'maj7', 'min7'],
  sus: ['sus2', 'sus4', 'add9'],
}

/** Whether a voicing's chord belongs under a Chords-page quality filter. */
export function matchesQuality(chordId: string, quality: VoicingQuality): boolean {
  return quality === 'all' || QUALITY_CHORD_IDS[quality].includes(chordId)
}

/**
 * String column order for rendering a chord chart. Right-handed convention puts the lowest
 * string on the left; left-handed mirrors it. `count` strings, 1-based low→high.
 */
export function displayStringOrder(count: number, leftHanded: boolean): number[] {
  const order = Array.from({ length: count }, (_, i) => i + 1)
  return leftHanded ? order.reverse() : order
}
