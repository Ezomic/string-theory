import { BigIcon, Button } from '../ui'
import styles from './mic.module.css'

// A5 — mic denied fallback
interface MicDeniedProps {
  onRetry: () => void
  onContinueWithoutMic: () => void
}

export function MicDenied({ onRetry, onContinueWithoutMic }: MicDeniedProps) {
  return (
    <div className={styles.centerCol}>
      <BigIcon tone="bad">🔇</BigIcon>
      <h2 className={styles.heading}>Microphone is off</h2>
      <p className={styles.body}>
        This screen needs it to work. You can still do theory lessons, the fretboard, and ear
        training (playback only).
      </p>
      <Button variant="warn" onClick={onRetry}>
        Try enabling again
      </Button>
      <Button variant="ghost" onClick={onContinueWithoutMic}>
        Continue without mic
      </Button>
    </div>
  )
}
