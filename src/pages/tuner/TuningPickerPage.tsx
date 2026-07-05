import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Button, RadioOption } from '../../components/ui'
import { noteToHz } from '../../lib/pitch/noteMath'
import { formatTuningLabel, tuningsFor } from '../../lib/tunings'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './TuningPickerPage.module.css'

function isValidNoteName(note: string): boolean {
  try {
    noteToHz(note, 4)
    return true
  } catch {
    return false
  }
}

// F3 alt tunings picker
export function TuningPickerPage() {
  const navigate = useNavigate()
  const activeInstrument = useInstrumentStore((state) => state.activeInstrument)
  const config = useInstrumentStore((state) => state.configs[activeInstrument])
  const setTuning = useInstrumentStore((state) => state.setTuning)

  const definitions = tuningsFor(activeInstrument)
  const currentIndex = definitions.findIndex(
    (def) => formatTuningLabel(def.notes) === formatTuningLabel(config.tuning),
  )

  const [selectedIndex, setSelectedIndex] = useState(currentIndex)
  const [showCustom, setShowCustom] = useState(currentIndex === -1)
  const [customNotes, setCustomNotes] = useState<string[]>(config.tuning)

  const customValid = customNotes.every(isValidNoteName)

  function handleUseTuning() {
    if (showCustom) {
      if (!customValid) return
      setTuning(activeInstrument, 'custom', customNotes)
    } else {
      const def = definitions[selectedIndex]
      setTuning(activeInstrument, def.preset, def.notes)
    }
    navigate('/tools/tuner')
  }

  return (
    <div className={styles.page}>
      <AppBar
        title="Tuning"
        subtitle={activeInstrument === 'guitar' ? 'Guitar' : 'Bass'}
        onClose={() => navigate('/tools/tuner')}
      />

      {!showCustom &&
        definitions.map((def, index) => (
          <RadioOption
            key={def.label}
            label={def.label}
            description={formatTuningLabel(def.notes)}
            selected={index === selectedIndex}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}

      {showCustom && (
        <div className={styles.customBuilder}>
          {customNotes.map((note, index) => (
            <input
              key={index}
              className={[styles.customInput, isValidNoteName(note) ? '' : styles.customInvalid]
                .filter(Boolean)
                .join(' ')}
              value={note}
              maxLength={2}
              onChange={(event) => {
                const next = [...customNotes]
                next[index] = event.target.value.trim()
                setCustomNotes(next)
              }}
            />
          ))}
          {!customValid && <p className={styles.error}>Use note names like E, A#, or Bb.</p>}
        </div>
      )}

      <Button
        variant="ghost"
        onClick={() => {
          if (!showCustom) {
            setCustomNotes(
              selectedIndex >= 0 ? definitions[selectedIndex].notes : config.tuning,
            )
          }
          setShowCustom(!showCustom)
        }}
      >
        {showCustom ? '← Back to presets' : '+ Custom tuning'}
      </Button>
      <Button onClick={handleUseTuning} disabled={showCustom && !customValid}>
        Use this tuning
      </Button>
    </div>
  )
}
