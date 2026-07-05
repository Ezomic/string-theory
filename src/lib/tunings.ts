import type { Instrument, TuningPreset } from './db/types'

export interface TuningDefinition {
  preset: TuningPreset
  label: string
  /** Notes low to high. */
  notes: string[]
}

export const GUITAR_TUNINGS: TuningDefinition[] = [
  { preset: 'standard', label: 'Standard', notes: ['E', 'A', 'D', 'G', 'B', 'E'] },
  { preset: 'dropD', label: 'Drop D', notes: ['D', 'A', 'D', 'G', 'B', 'E'] },
  {
    preset: 'halfStepDown',
    label: 'Half-step down',
    notes: ['D#', 'G#', 'C#', 'F#', 'A#', 'D#'],
  },
  { preset: 'dadgad', label: 'DADGAD', notes: ['D', 'A', 'D', 'G', 'A', 'D'] },
  { preset: 'openG', label: 'Open G', notes: ['D', 'G', 'D', 'G', 'B', 'D'] },
]

export const BASS_TUNINGS: TuningDefinition[] = [
  { preset: 'standard', label: 'Standard', notes: ['E', 'A', 'D', 'G'] },
  { preset: 'standard', label: 'Standard (5-string)', notes: ['B', 'E', 'A', 'D', 'G'] },
  { preset: 'dropD', label: 'Drop D', notes: ['D', 'A', 'D', 'G'] },
]

export function tuningsFor(instrument: Instrument): TuningDefinition[] {
  return instrument === 'guitar' ? GUITAR_TUNINGS : BASS_TUNINGS
}

export function defaultTuningFor(instrument: Instrument): TuningDefinition {
  return tuningsFor(instrument)[0]
}

export function formatTuningLabel(notes: string[]): string {
  return notes.join(' ')
}
