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
  {
    id: 'chromatic-warmup',
    title: 'Chromatic Warm-Up',
    artist: 'Original',
    difficulty: 'easy',
    tempo: 80,
    tags: ['technique'],
    instrument: 'guitar',
    notes: ['E', 'F', 'F#', 'G', 'G#', 'A'],
  },
  {
    id: 'punk-downstrokes',
    title: 'Punk Downstrokes',
    artist: 'Original',
    difficulty: 'easy',
    tempo: 180,
    tags: ['punk'],
    instrument: 'guitar',
    notes: ['E', 'E', 'A', 'A', 'D', 'D', 'E', 'E'],
  },
  {
    id: 'reggae-skank',
    title: 'Reggae Skank',
    artist: 'Original',
    difficulty: 'easy',
    tempo: 90,
    tags: ['reggae'],
    instrument: 'guitar',
    notes: ['A', 'C#', 'E', 'A', 'C#', 'E'],
  },
  {
    id: 'metal-gallop',
    title: 'Metal Gallop',
    artist: 'Original',
    difficulty: 'medium',
    tempo: 160,
    tags: ['metal'],
    instrument: 'guitar',
    notes: ['E', 'E', 'E', 'G', 'E', 'E', 'E', 'F'],
  },
  {
    id: 'motown-bassline',
    title: 'Motown Bassline',
    artist: 'Traditional',
    difficulty: 'medium',
    tempo: 115,
    tags: ['soul', 'bass'],
    instrument: 'bass',
    notes: ['C', 'E', 'G', 'A', 'G', 'E', 'C'],
  },
  {
    id: 'chicken-pickin-lick',
    title: "Chicken Pickin' Lick",
    artist: 'Original',
    difficulty: 'hard',
    tempo: 130,
    tags: ['country'],
    instrument: 'guitar',
    notes: ['G', 'B', 'D', 'E', 'D', 'B', 'G'],
  },
  {
    id: 'jazz-ii-v-i-lick',
    title: 'ii–V–I Lick',
    artist: 'Traditional',
    difficulty: 'hard',
    tempo: 120,
    tags: ['jazz'],
    instrument: 'guitar',
    notes: ['D', 'F', 'A', 'C', 'B', 'G', 'F', 'E'],
  },
]

export function riffById(id: string): Riff | undefined {
  return RIFFS.find((r) => r.id === id)
}

export function riffsByDifficulty(difficulty: RiffDifficulty | 'all'): Riff[] {
  return difficulty === 'all' ? RIFFS : RIFFS.filter((r) => r.difficulty === difficulty)
}
