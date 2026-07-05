export type Instrument = 'guitar' | 'bass'
export type MarkerRole = 'root' | 'scale' | 'chord' | 'interval' | 'correct' | 'ghost'
export type LabelMode = 'names' | 'degrees' | 'intervals' | 'none'

export interface FretboardMarker {
  /** 1-based string index, counting from the lowest-pitched string (tuning[0] = string 1). */
  string: number
  fret: number
  label: string
  role: MarkerRole
}

export interface FretboardProps {
  instrument: Instrument
  /** Note names low to high, e.g. ['E', 'A', 'D', 'G', 'B', 'E'] for standard guitar. */
  tuning: string[]
  /** Number of frets to display, from 0 (open string) to this value inclusive. */
  frets: number
  markers: FretboardMarker[]
  labelMode: LabelMode
  leftHanded: boolean
  onFretTap?: (string: number, fret: number) => void
}
