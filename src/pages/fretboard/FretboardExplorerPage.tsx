import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fretboard } from '../../components/Fretboard'
import { AppBar, Button, Card, Pill, Segmented } from '../../components/ui'
import { NOTE_NAMES, transposeNote, type NoteName } from '../../lib/pitch/noteMath'
import { CHORDS, SCALES, fretboardMarkersForNotes, notesForFormula } from '../../lib/theory'
import { Legend } from './Legend'
import { PillChoiceRow } from './PillChoiceRow'
import { VARIANTS, type FretboardVariant } from './instrumentVariants'
import styles from './FretboardExplorerPage.module.css'

const FRETS = 12
type ShowMode = 'scale' | 'chord' | 'interval'

// G1 scale view / G2 chord view, unified behind the "Show" tabs
export function FretboardExplorerPage() {
  const navigate = useNavigate()
  const [variant, setVariant] = useState<FretboardVariant>('guitar')
  const [showMode, setShowMode] = useState<ShowMode>('scale')
  const [root, setRoot] = useState<NoteName>('C')
  const [scaleId, setScaleId] = useState(SCALES[0].id)
  const [chordId, setChordId] = useState(CHORDS[0].id)

  const tuning = VARIANTS[variant].tuning
  const scale = SCALES.find((s) => s.id === scaleId) ?? SCALES[0]
  const chord = CHORDS.find((c) => c.id === chordId) ?? CHORDS[0]

  const isChordMode = showMode === 'chord'
  const definition = isChordMode ? chord : scale
  const notes = notesForFormula(root, definition.formula)
  const markers = fretboardMarkersForNotes(
    tuning,
    FRETS,
    notes,
    root,
    isChordMode ? 'chord' : 'scale',
    showMode === 'interval' ? 'intervals' : 'names',
  )

  return (
    <div className={styles.page}>
      <AppBar
        title="Fretboard"
        subtitle={`${root} ${definition.label} · ${showMode}`}
        onBack={() => navigate('/tools')}
      />

      <Segmented
        options={[
          { value: 'guitar', label: 'Guitar' },
          { value: 'bass4', label: 'Bass' },
          { value: 'bass5', label: 'Bass 5' },
        ]}
        value={variant}
        onChange={setVariant}
      />

      <div className={styles.fretboardWrap}>
        <Fretboard
          instrument={variant === 'guitar' ? 'guitar' : 'bass'}
          tuning={tuning}
          frets={FRETS}
          markers={markers}
          labelMode={showMode === 'interval' ? 'intervals' : 'names'}
          leftHanded={false}
        />
        <Legend
          items={
            isChordMode
              ? [
                  { color: 'var(--accent2)', label: `Root (${root})` },
                  { color: 'var(--accent)', label: 'Chord tone' },
                ]
              : [
                  { color: 'var(--accent2)', label: `Root (${root})` },
                  { color: 'var(--accent)', label: 'Scale tone' },
                ]
          }
        />
      </div>

      <Card className={styles.showCard}>
        <div className={styles.showRow}>
          <span className={styles.showLabel}>Show</span>
          <div className={styles.showPills}>
            {(['scale', 'chord', 'interval'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setShowMode(mode)}>
                <Pill variant={showMode === mode ? 'accent' : 'default'}>
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Pill>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <p className={styles.sectionLabel}>Root</p>
      <PillChoiceRow
        options={NOTE_NAMES.map((note) => ({ value: note, label: note }))}
        value={root}
        onChange={setRoot}
      />

      {isChordMode ? (
        <>
          <p className={styles.sectionLabel}>Chord quality</p>
          <PillChoiceRow
            options={CHORDS.map((c) => ({ value: c.id, label: c.label }))}
            value={chordId}
            onChange={setChordId}
          />
          <div className={styles.prevNextRow}>
            <button type="button" onClick={() => setRoot(transposeNote(root, -1))}>
              ◀ Prev
            </button>
            <button type="button" onClick={() => setRoot(transposeNote(root, 1))}>
              Next ▶
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.sectionLabel}>Scale</p>
          <PillChoiceRow
            options={SCALES.map((s) => ({ value: s.id, label: s.label }))}
            value={scaleId}
            onChange={setScaleId}
          />
          <Button
            variant="ghost"
            onClick={() => navigate(`/tools/fretboard/quiz?variant=${variant}`)}
          >
            🎯 Quiz me
          </Button>
        </>
      )}
    </div>
  )
}
