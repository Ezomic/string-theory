import { useNavigate, useParams } from 'react-router-dom'
import { AppBar, Card, NoteChip, Pill } from '../../components/ui'
import { riffById } from '../../lib/riffs'
import styles from './RiffDetailPage.module.css'

export function RiffDetailPage() {
  const navigate = useNavigate()
  const { riffId } = useParams()
  const riff = riffId ? riffById(riffId) : undefined

  if (!riff) {
    return (
      <div className={styles.page}>
        <AppBar title="Riff" onClose={() => navigate('/tools/riffs')} />
        <p className={styles.notFound}>Riff not found.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppBar title={riff.title} subtitle={riff.artist} onBack={() => navigate('/tools/riffs')} />

      <Card className={styles.metaCard}>
        <div className={styles.metaRow}>
          <Pill variant={riff.difficulty === 'easy' ? 'good' : riff.difficulty === 'hard' ? 'warn' : 'default'}>
            {riff.difficulty}
          </Pill>
          <Pill>♩ = {riff.tempo} bpm</Pill>
          <Pill>🎸 {riff.instrument}</Pill>
        </div>
        <div className={styles.tags}>
          {riff.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      </Card>

      <Card className={styles.notesCard}>
        <h4 className={styles.notesTitle}>The notes</h4>
        <div className={styles.chipRow}>
          {riff.notes.map((note, index) => (
            <NoteChip key={index} label={note} state="idle" />
          ))}
        </div>
        <p className={styles.soon}>🎤 Mic play-along coming soon</p>
      </Card>
    </div>
  )
}
