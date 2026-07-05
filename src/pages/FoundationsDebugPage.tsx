import { useEffect, useRef, useState } from 'react'
import { Fretboard, type FretboardMarker, type Instrument as FbInstrument } from '../components/Fretboard'
import {
  AppBar,
  BottomNav,
  Button,
  Card,
  Pill,
  RadioOption,
  SectionLabel,
  Segmented,
  StatTile,
  Toggle,
  TunerMeter,
  type BottomNavTab,
} from '../components/ui'
import { PitchEngine, type PermissionState, type PitchReading } from '../lib/pitch/pitchEngine'

const TUNINGS: Record<FbInstrument, string[]> = {
  guitar: ['E', 'A', 'D', 'G', 'B', 'E'],
  bass: ['E', 'A', 'D', 'G'],
}

// Demo markers: a C major scale pattern plus one of each marker role, so the
// Fretboard's role → color mapping can be visually verified with arbitrary data.
const DEMO_MARKERS: FretboardMarker[] = [
  { string: 1, fret: 3, label: 'C', role: 'root' },
  { string: 1, fret: 5, label: 'D', role: 'scale' },
  { string: 2, fret: 2, label: 'C', role: 'root' },
  { string: 2, fret: 3, label: 'D♭', role: 'ghost' },
  { string: 3, fret: 0, label: 'D', role: 'interval' },
  { string: 3, fret: 2, label: 'E', role: 'chord' },
  { string: 4, fret: 5, label: 'C', role: 'correct' },
]

export function FoundationsDebugPage() {
  const engineRef = useRef<PitchEngine | null>(null)
  const [listening, setListening] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt')
  const [reading, setReading] = useState<PitchReading | null>(null)

  const [instrument, setInstrument] = useState<FbInstrument>('guitar')
  const [leftHanded, setLeftHanded] = useState(false)
  const [labelMode, setLabelMode] = useState<'names' | 'degrees' | 'intervals' | 'none'>('names')
  const [lastTap, setLastTap] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<BottomNavTab>('tools')

  useEffect(() => {
    const engine = new PitchEngine()
    engineRef.current = engine
    const unsubscribe = engine.onPitch(setReading)
    return () => {
      unsubscribe()
      engine.stop()
    }
  }, [])

  async function handleToggleListening() {
    const engine = engineRef.current
    if (!engine) return

    if (listening) {
      engine.stop()
      setListening(false)
      setReading(null)
      return
    }

    const state = await engine.start()
    setPermissionState(state)
    setListening(state === 'granted')
  }

  return (
    <>
      <AppBar title="Milestone 0 — Foundations" />

      <main style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <SectionLabel>pitchEngine debug</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 12 }}>
            <Button onClick={handleToggleListening} style={{ width: 'auto', flex: 'none' }}>
              {listening ? 'Stop listening' : 'Start listening'}
            </Button>
            <Pill variant={permissionState === 'denied' ? 'warn' : 'default'}>
              mic: {permissionState}
            </Pill>
          </div>

          {permissionState === 'denied' && (
            <p style={{ color: 'var(--warn)', fontSize: 13 }}>
              Microphone access was denied. Allow microphone access in your browser settings and
              try again — audio is processed on-device only and never uploaded.
            </p>
          )}

          {listening && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <StatTile label="Note" value={reading ? `${reading.note}${reading.octave}` : '—'} />
                <StatTile label="Hz" value={reading ? reading.hz.toFixed(1) : '—'} />
                <StatTile label="Cents" value={reading ? reading.cents.toFixed(0) : '—'} />
                <StatTile
                  label="Confidence"
                  value={reading ? `${Math.round(reading.confidence * 100)}%` : '—'}
                />
              </div>
              <TunerMeter cents={reading?.cents ?? 0} />
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Fretboard debug</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: '8px 0 12px' }}>
            <Segmented
              options={[
                { value: 'guitar', label: 'Guitar' },
                { value: 'bass', label: 'Bass' },
              ]}
              value={instrument}
              onChange={setInstrument}
            />
            <Segmented
              options={[
                { value: 'names', label: 'Names' },
                { value: 'degrees', label: 'Degrees' },
                { value: 'intervals', label: 'Intervals' },
                { value: 'none', label: 'None' },
              ]}
              value={labelMode}
              onChange={setLabelMode}
            />
            <Toggle checked={leftHanded} onChange={setLeftHanded} label="Left-handed" />
          </div>

          <Fretboard
            instrument={instrument}
            tuning={TUNINGS[instrument]}
            frets={12}
            markers={DEMO_MARKERS}
            labelMode={labelMode}
            leftHanded={leftHanded}
            onFretTap={(stringNumber, fret) => setLastTap(`string ${stringNumber}, fret ${fret}`)}
          />

          {lastTap && (
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>Last tap: {lastTap}</p>
          )}
        </Card>

        <Card>
          <SectionLabel>Component library</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <RadioOption label="Radio option" selected onSelect={() => {}} />
          </div>
        </Card>
      </main>

      <BottomNav active={activeTab} onSelect={setActiveTab} />
    </>
  )
}
