import { BigIcon, Button } from '../ui'
import styles from './mic.module.css'

// A4 — mic permission pre-prompt
interface MicPermissionPromptProps {
  onEnable: () => void
}

export function MicPermissionPrompt({ onEnable }: MicPermissionPromptProps) {
  return (
    <div className={styles.centerCol}>
      <BigIcon>🎤</BigIcon>
      <h2 className={styles.heading}>Let String Theory hear you</h2>
      <p className={styles.body}>
        The tuner, ear checks, and play-along feedback all listen through your mic. Audio never
        leaves your device.
      </p>
      <Button onClick={onEnable}>Enable microphone</Button>
      <p className={styles.hint}>You'll see a system prompt next</p>
    </div>
  )
}
