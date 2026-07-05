import styles from './NoteChip.module.css'

export type NoteChipState = 'clean' | 'sharp' | 'flat' | 'now' | 'idle'

interface NoteChipProps {
  label: string
  state: NoteChipState
}

export function NoteChip({ label, state }: NoteChipProps) {
  return <span className={[styles.chip, styles[state]].join(' ')}>{label}</span>
}
