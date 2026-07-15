import type { Instrument } from './db/types'
import type { NoteName } from './pitch/noteMath'

export type RiffDifficulty = 'easy' | 'medium' | 'hard'

export interface Riff {
  id: string
  title: string
  /** Kept original/traditional — never a copyrighted work. */
  artist: string
  difficulty: RiffDifficulty
  tempo: number
  tags: string[]
  instrument: Instrument
  /** Ordered note sequence the mic play-along (C2) matches, like an exercise's expectedNotes. */
  notes: NoteName[]
}

export const RIFF_DIFFICULTIES: RiffDifficulty[] = ['easy', 'medium', 'hard']

export const RIFFS: Riff[] = [
  {
    id: 'pentatonic-rock-lick',
    title: 'Pentatonic Rock Lick',
    artist: 'Original',
    difficulty: 'easy',
    tempo: 100,
    tags: ['rock', 'pentatonic'],
    instrument: 'guitar',
    notes: ['A', 'C', 'D', 'E', 'G', 'A', 'G', 'E', 'D', 'C', 'A'],
  },
  {
    id: 'blues-shuffle',
    title: 'Blues Shuffle',
    artist: 'Traditional',
    difficulty: 'medium',
    tempo: 90,
    tags: ['blues'],
    instrument: 'guitar',
    notes: ['E', 'G', 'A', 'A#', 'B', 'A', 'G', 'E'],
  },
  {
    id: 'power-chord-groove',
    title: 'Power-Chord Groove',
    artist: 'Original',
    difficulty: 'easy',
    tempo: 130,
    tags: ['rock', 'punk'],
    instrument: 'guitar',
    notes: ['E', 'E', 'G', 'G', 'A', 'A', 'E', 'E'],
  },
  {
    id: 'surf-twang',
    title: 'Surf Twang',
    artist: 'Original',
    difficulty: 'medium',
    tempo: 120,
    tags: ['surf', 'rock'],
    instrument: 'guitar',
    notes: ['E', 'F#', 'G#', 'A', 'B', 'A', 'G#', 'F#', 'E'],
  },
  {
    id: 'funk-scratch-riff',
    title: 'Funk Scratch Riff',
    artist: 'Original',
    difficulty: 'hard',
    tempo: 110,
    tags: ['funk'],
    instrument: 'guitar',
    notes: ['E', 'G', 'A', 'B', 'D', 'B', 'A', 'G', 'E', 'D', 'E'],
  },
  {
    id: 'walking-bass-groove',
    title: 'Walking Bass Groove',
    artist: 'Traditional',
    difficulty: 'medium',
    tempo: 100,
    tags: ['jazz', 'bass'],
    instrument: 'bass',
    notes: ['C', 'E', 'G', 'A', 'A#', 'A', 'G', 'E'],
  },
  {
    id: 'octave-bass-groove',
    title: 'Octave Bass Groove',
    artist: 'Original',
    difficulty: 'easy',
    tempo: 110,
    tags: ['pop', 'bass'],
    instrument: 'bass',
    notes: ['A', 'A', 'E', 'A', 'D', 'D', 'A', 'E'],
  },
  {
    id: 'folk-fingerpicking',
    title: 'Folk Fingerpicking Pattern',
    artist: 'Traditional',
    difficulty: 'easy',
    tempo: 85,
    tags: ['folk'],
    instrument: 'guitar',
    notes: ['G', 'B', 'D', 'G', 'B', 'D', 'G', 'D', 'B', 'G'],
  },
]

export function riffById(id: string): Riff | undefined {
  return RIFFS.find((r) => r.id === id)
}

export function riffsByDifficulty(difficulty: RiffDifficulty | 'all'): Riff[] {
  return difficulty === 'all' ? RIFFS : RIFFS.filter((r) => r.difficulty === difficulty)
}
