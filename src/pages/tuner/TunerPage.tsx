import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MicGate } from '../../components/mic/MicGate'
import { AppBar, Pill, Segmented, TunerMeter } from '../../components/ui'
import { formatTuningLabel, tuningsFor } from '../../lib/tunings'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './TunerPage.module.css'

// F1 tuner-guitar / F2 tuner-bass
export function TunerPage() {
  const navigate = useNavigate()
  const activeInstrument = useInstrumentStore((state) => state.activeInstrument)
  const setActiveInstrument = useInstrumentStore((state) => state.setActiveInstrument)
  const config = useInstrumentStore((state) => state.configs[activeInstrument])
  const [lockedString, setLockedString] = useState<number | null>(null)

  return (
    <div className={styles.page}>
      <AppBar title="Tuner" subtitle="Listening… 🎤" onBack={() => navigate('/tools')} />

      <Segmented
        options={[
          { value: 'guitar', label: 'Guitar' },
          { value: 'bass', label: 'Bass' },
        ]}
        value={activeInstrument}
        onChange={setActiveInstrument}
      />

      <div className={styles.tuningRow}>
        <span className={styles.tuningLabel}>
          {tuningsFor(activeInstrument).find((t) => t.preset === config.tuningPreset)?.label ??
            'Custom'}{' '}
          · {formatTuningLabel(config.tuning)}
        </span>
        <button
          type="button"
          className={styles.tuningsButton}
          onClick={() => navigate('/tools/tuner/tunings')}
        >
          <Pill>Alt tunings ▾</Pill>
        </button>
      </div>

      <MicGate onContinueWithoutMic={() => navigate('/tools')}>
        {(reading) => {
          const cents = reading?.cents ?? 0
          const inTune = reading !== null && Math.abs(cents) <= 5
          const flat = reading !== null && cents < -5
          const sharp = reading !== null && cents > 5

          const stringMatch =
            lockedString !== null
              ? lockedString
              : reading
                ? config.tuning.findIndex((note) => note === reading.note)
                : -1

          return (
            <>
              <div className={styles.noteDisplay}>
                {reading ? (
                  <>
                    {reading.note}
                    <small>{reading.octave}</small>
                  </>
                ) : (
                  '—'
                )}
              </div>
              <div
                className={styles.state}
                data-tone={inTune ? 'good' : flat || sharp ? 'warn' : 'muted'}
              >
                {!reading && 'Play a note'}
                {inTune && 'In tune ✓'}
                {flat && `Flat — tune up ♭ ${cents}¢`}
                {sharp && `Sharp ♯ +${cents}¢`}
              </div>

              <TunerMeter cents={cents} />

              <p className={styles.sectionLabel}>Strings — tap to target</p>
              <div className={styles.strings}>
                {config.tuning.map((note, index) => (
                  <button
                    key={index}
                    type="button"
                    className={[styles.string, stringMatch === index ? styles.stringOn : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setLockedString(lockedString === index ? null : index)}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </>
          )
        }}
      </MicGate>
    </div>
  )
}
