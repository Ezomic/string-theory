import { VOICES } from '../../lib/audio/voices'
import type { VoiceSelection } from '../../lib/db/types'
import styles from './VoiceSelect.module.css'

interface VoiceSelectProps {
  value: VoiceSelection
  onChange: (voice: VoiceSelection) => void
}

export function VoiceSelect({ value, onChange }: VoiceSelectProps) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(event) => onChange(event.target.value as VoiceSelection)}
    >
      <option value="random">🔀 Random</option>
      {VOICES.map((voice) => (
        <option key={voice.id} value={voice.id}>
          {voice.label}
        </option>
      ))}
    </select>
  )
}
