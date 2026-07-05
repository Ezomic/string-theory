import { VOICES } from '../../lib/audio/voices'
import type { VoiceId } from '../../lib/db/types'
import styles from './VoiceSelect.module.css'

interface VoiceSelectProps {
  value: VoiceId
  onChange: (voice: VoiceId) => void
}

export function VoiceSelect({ value, onChange }: VoiceSelectProps) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(event) => onChange(event.target.value as VoiceId)}
    >
      {VOICES.map((voice) => (
        <option key={voice.id} value={voice.id}>
          {voice.label}
        </option>
      ))}
    </select>
  )
}
