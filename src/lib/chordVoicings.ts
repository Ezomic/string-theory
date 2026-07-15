export interface ChordBarre {
  fret: number
  /** 1-based string indices (low→high) the barre spans, inclusive. */
  fromString: number
  toString: number
}

export interface ChordVoicing {
  id: string
  name: string
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
    chordId: 'major',
    baseFret: 1,
    frets: [null, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
  },
  {
    id: 'a-major-open',
    name: 'A major',
    chordId: 'major',
    baseFret: 1,
    frets: [null, 0, 2, 2, 2, 0],
    fingers: [null, null, 1, 2, 3, null],
  },
  {
    id: 'g-major-open',
    name: 'G major',
    chordId: 'major',
    baseFret: 1,
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, null, null, null, 3],
  },
  {
    id: 'e-major-open',
    name: 'E major',
    chordId: 'major',
    baseFret: 1,
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [null, 2, 3, 1, null, null],
  },
  {
    id: 'd-major-open',
    name: 'D major',
    chordId: 'major',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
  },
  {
    id: 'a-minor-open',
    name: 'A minor',
    chordId: 'minor',
    baseFret: 1,
    frets: [null, 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
  },
  {
    id: 'e-minor-open',
    name: 'E minor',
    chordId: 'minor',
    baseFret: 1,
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
  },
  {
    id: 'd-minor-open',
    name: 'D minor',
    chordId: 'minor',
    baseFret: 1,
    frets: [null, null, 0, 2, 3, 1],
    fingers: [null, null, null, 2, 3, 1],
  },
  {
    id: 'cmaj7-open',
    name: 'Cmaj7',
    chordId: 'maj7',
    baseFret: 1,
    frets: [null, 3, 2, 0, 0, 0],
    fingers: [null, 3, 2, null, null, null],
  },
  {
    id: 'g7-open',
    name: 'G7',
    chordId: 'dom7',
    baseFret: 1,
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, null, null, null, 1],
  },
  {
    id: 'f-major-barre',
    name: 'F major (barre)',
    chordId: 'major',
    baseFret: 1,
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barres: [{ fret: 1, fromString: 1, toString: 6 }],
  },
  {
    id: 'b-minor-barre',
    name: 'B minor (barre)',
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

/**
 * String column order for rendering a chord chart. Right-handed convention puts the lowest
 * string on the left; left-handed mirrors it. `count` strings, 1-based low→high.
 */
export function displayStringOrder(count: number, leftHanded: boolean): number[] {
  const order = Array.from({ length: count }, (_, i) => i + 1)
  return leftHanded ? order.reverse() : order
}
