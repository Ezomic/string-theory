import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Pill, Segmented } from '../../components/ui'
import { riffsByDifficulty, type RiffDifficulty } from '../../lib/riffs'
import styles from './RiffLibraryPage.module.css'

type Filter = RiffDifficulty | 'all'

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const DIFFICULTY_VARIANT: Record<RiffDifficulty, 'good' | 'default' | 'warn'> = {
  easy: 'good',
  medium: 'default',
  hard: 'warn',
}

export function RiffLibraryPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const riffs = riffsByDifficulty(filter)

  return (
    <div className={styles.page}>
      <AppBar title="Riffs" subtitle="Play along to real licks" onBack={() => navigate('/tools')} />

      <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

      <div className={styles.list}>
        {riffs.map((riff) => (
          <button
            key={riff.id}
            type="button"
            className={styles.opt}
            onClick={() => navigate(`/tools/riffs/${riff.id}`)}
          >
            <span className={styles.optIcon}>{riff.instrument === 'bass' ? '🎸' : '🎵'}</span>
            <span className={styles.optText}>
              <span className={styles.optTitle}>{riff.title}</span>
              <span className={styles.optSub}>
                {riff.artist} · ♩ = {riff.tempo} · {riff.instrument}
              </span>
              <span className={styles.tags}>
                {riff.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    #{tag}
                  </span>
                ))}
              </span>
            </span>
            <Pill variant={DIFFICULTY_VARIANT[riff.difficulty]}>{riff.difficulty}</Pill>
          </button>
        ))}
      </div>
    </div>
  )
}
