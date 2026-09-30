import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChordDiagram } from '../../components/ChordDiagram'
import { AppBar, Button, Card, NoteChip, Pill, Segmented } from '../../components/ui'
import { playbackEngine } from '../../lib/audio/playbackEngine'
import { CHORD_PROGRESSIONS } from '../../lib/chordProgressions'
import { CHORD_VOICINGS, chordSymbol, matchesQuality, voicingById, type VoicingQuality } from '../../lib/chordVoicings'
import { getAll } from '../../lib/db/db'
import type { StrumRunKind } from '../../lib/db/types'
import { noteToHz, type NoteName } from '../../lib/pitch/noteMath'
import { STROKE_GLYPHS, STRUM_PATTERNS, type StrumDifficulty } from '../../lib/strumPatterns'
import { bestByItem, type StrumBest } from '../../lib/strumRuns'
import { CHORDS, noteLabelFor, notesForFormula } from '../../lib/theory'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './ChordLibraryPage.module.css'

const CHORD_OCTAVE = 4

type Tab = 'shapes' | 'progressions' | 'patterns'

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'shapes', label: 'Shapes' },
  { value: 'progressions', label: 'Progressions' },
  { value: 'patterns', label: 'Patterns' },
]

const QUALITY_OPTIONS: { value: VoicingQuality; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'seventh', label: '7th' },
  { value: 'sus', label: 'Sus/add9' },
]

const ROOTS: (NoteName | 'all')[] = ['all', 'C', 'D', 'E', 'F', 'G', 'A', 'B']

const DIFFICULTY_VARIANT: Record<StrumDifficulty, 'good' | 'default' | 'warn'> = {
  easy: 'good',
  medium: 'default',
  hard: 'warn',
}

const SUBDIVISION_NAME: Record<number, string> = { 2: 'eighths', 3: 'triplets', 4: '16ths' }

function tabFrom(param: string | null): Tab {
  return param === 'progressions' || param === 'patterns' ? param : 'shapes'
}

export function ChordLibraryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabFrom(searchParams.get('tab'))

  function selectTab(next: Tab) {
    setSearchParams(next === 'shapes' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div className={styles.page}>
      <AppBar title="Chords" subtitle="Shapes, progressions and strumming" onBack={() => navigate('/tools')} />
      <Segmented options={TAB_OPTIONS} value={tab} onChange={selectTab} />
      {tab === 'shapes' && <ShapesTab />}
      {tab === 'progressions' && <ProgressionsTab />}
      {tab === 'patterns' && <PatternsTab />}
    </div>
  )
}

function ShapesTab() {
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const leftHanded = useInstrumentStore((state) => state.configs[state.activeInstrument].leftHanded)

  const [root, setRoot] = useState<NoteName | 'all'>('all')
  const [quality, setQuality] = useState<VoicingQuality>('all')

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
    <>
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
    </>
  )
}

function useStrumBests(kind: StrumRunKind): Record<string, StrumBest> {
  const [bests, setBests] = useState<Record<string, StrumBest>>({})
  useEffect(() => {
    getAll('strumRuns').then((runs) => setBests(bestByItem(runs, kind)))
  }, [kind])
  return bests
}

function BestPill({ best }: { best: StrumBest | undefined }) {
  if (!best) return <Pill variant="warn">new</Pill>
  return (
    <Pill variant={best.score >= 85 ? 'good' : 'default'}>
      {best.score}% · ♩{best.tempo}
    </Pill>
  )
}

interface StrumItemProps {
  icon: string
  title: string
  subtitle: string
  strokes?: string
  difficulty: StrumDifficulty
  best: StrumBest | undefined
  onOpen: () => void
}

function StrumItem({ icon, title, subtitle, strokes, difficulty, best, onOpen }: StrumItemProps) {
  return (
    <button type="button" className={styles.opt} onClick={onOpen}>
      <span className={styles.optIcon}>{icon}</span>
      <span className={styles.optText}>
        <span className={styles.optTitle}>{title}</span>
        {strokes && <span className={styles.optStrokes}>{strokes}</span>}
        <span className={styles.optSub}>{subtitle}</span>
      </span>
      <span className={styles.pills}>
        <Pill variant={DIFFICULTY_VARIANT[difficulty]}>{difficulty}</Pill>
        <BestPill best={best} />
      </span>
    </button>
  )
}

function ProgressionsTab() {
  const navigate = useNavigate()
  const bests = useStrumBests('progression')

  return (
    <>
      <p className={styles.lead}>Open-chord changes against a click. Play along, then rate the run.</p>
      <div className={styles.list}>
        {CHORD_PROGRESSIONS.map((progression) => {
          const chords = [...new Set(progression.bars)].map((id) => chordSymbol(voicingById(id)!))
          return (
            <StrumItem
              key={progression.id}
              icon="🎶"
              title={progression.name}
              subtitle={`${chords.join(' · ')} · ♩ = ${progression.tempo}`}
              difficulty={progression.difficulty}
              best={bests[progression.id]}
              onOpen={() => navigate(`/tools/chords/progressions/${progression.id}`)}
            />
          )
        })}
      </div>
    </>
  )
}

function PatternsTab() {
  const navigate = useNavigate()
  const bests = useStrumBests('pattern')

  return (
    <>
      <p className={styles.lead}>Strumming-hand drills on one chord, so the rhythm gets all your attention.</p>
      <div className={styles.list}>
        {STRUM_PATTERNS.map((pattern) => {
          const beats = Array.from({ length: pattern.beatsPerBar }, (_, beat) =>
            pattern.slots
              .slice(beat * pattern.subdivision, (beat + 1) * pattern.subdivision)
              .map((stroke) => STROKE_GLYPHS[stroke])
              .join(''),
          )
          return (
            <StrumItem
              key={pattern.id}
              icon="🎸"
              title={pattern.name}
              strokes={beats.join('  ')}
              subtitle={`${pattern.beatsPerBar}/4 in ${SUBDIVISION_NAME[pattern.subdivision]} · ♩ = ${pattern.tempo}`}
              difficulty={pattern.difficulty}
              best={bests[pattern.id]}
              onOpen={() => navigate(`/tools/chords/patterns/${pattern.id}`)}
            />
          )
        })}
      </div>
    </>
  )
}
