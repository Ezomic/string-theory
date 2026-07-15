import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChordDiagram } from '../../components/ChordDiagram'
import { AppBar, Button, Card, NoteChip, Segmented } from '../../components/ui'
import { playbackEngine } from '../../lib/audio/playbackEngine'
import { CHORD_VOICINGS } from '../../lib/chordVoicings'
import { noteToHz, type NoteName } from '../../lib/pitch/noteMath'
import { CHORDS, noteLabelFor, notesForFormula } from '../../lib/theory'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './ChordLibraryPage.module.css'

const CHORD_OCTAVE = 4

type Quality = 'all' | 'major' | 'minor' | 'seventh'

const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'seventh', label: '7th' },
]

const ROOTS: (NoteName | 'all')[] = ['all', 'C', 'D', 'E', 'F', 'G', 'A', 'B']

function matchesQuality(chordId: string, quality: Quality): boolean {
  if (quality === 'all') return true
  if (quality === 'seventh') return chordId === 'maj7' || chordId === 'dom7'
  return chordId === quality
}

export function ChordLibraryPage() {
  const navigate = useNavigate()
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const leftHanded = useInstrumentStore((state) => state.configs[state.activeInstrument].leftHanded)

  const [root, setRoot] = useState<NoteName | 'all'>('all')
  const [quality, setQuality] = useState<Quality>('all')

  const voicings = CHORD_VOICINGS.filter(
    (v) => (root === 'all' || v.root === root) && matchesQuality(v.chordId, quality),
  )

  function hear(voicingRoot: NoteName, chordId: string) {
    const formula = CHORDS.find((c) => c.id === chordId)!.formula
    const notes = notesForFormula(voicingRoot, formula)
    playbackEngine.play(
      notes.map((n) => noteToHz(n, CHORD_OCTAVE)),
      'harmonic',
    )
  }

  return (
    <div className={styles.page}>
      <AppBar title="Chords" subtitle="Shapes, sounds and fingerings" onBack={() => navigate('/tools')} />

      <div className={styles.rootRow}>
        {ROOTS.map((r) => (
          <button
            key={r}
            type="button"
            className={[styles.rootPill, root === r ? styles.rootOn : ''].filter(Boolean).join(' ')}
            onClick={() => setRoot(r)}
          >
            {r === 'all' ? 'All' : r}
          </button>
        ))}
      </div>

      <Segmented options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />

      {voicings.length === 0 ? (
        <p className={styles.empty}>No chords match that filter.</p>
      ) : (
        <div className={styles.grid}>
          {voicings.map((voicing) => {
            const formula = CHORDS.find((c) => c.id === voicing.chordId)!.formula
            const tones = notesForFormula(voicing.root, formula)
            return (
              <Card key={voicing.id} className={styles.card}>
                <ChordDiagram voicing={voicing} leftHanded={leftHanded} size={104} />
                <p className={styles.name}>{voicing.name}</p>
                <div className={styles.chips}>
                  {tones.map((note, i) => (
                    <NoteChip key={i} label={noteLabelFor(notationLabels, voicing.root, note)} state="idle" />
                  ))}
                </div>
                <Button variant="ghost" onClick={() => hear(voicing.root, voicing.chordId)}>
                  🔊 Hear
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
