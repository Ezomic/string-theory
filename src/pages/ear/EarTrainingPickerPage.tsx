import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Card, Pill, ProgressBar } from '../../components/ui'
import { getAll } from '../../lib/db/db'
import type { DrillResult } from '../../lib/db/types'
import { DRILL_CATEGORIES, statsForCategory, type CategoryStats } from '../../lib/earTraining'
import styles from './EarTrainingPickerPage.module.css'

// H1 — drill picker
export function EarTrainingPickerPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<DrillResult[] | null>(null)

  useEffect(() => {
    getAll('drillResults').then(setResults)
  }, [])

  if (!results) {
    return (
      <div className={styles.page}>
        <AppBar title="Ear training" subtitle="Pick a drill" onBack={() => navigate('/tools')} />
      </div>
    )
  }

  const statsByCategory = new Map(
    DRILL_CATEGORIES.map((category) => [category.id, statsForCategory(results, category.id)]),
  )
  const intervalsLevel = statsByCategory.get('intervals')?.level ?? 1

  return (
    <div className={styles.page}>
      <AppBar title="Ear training" subtitle="Pick a drill" onBack={() => navigate('/tools')} />

      {DRILL_CATEGORIES.map((category) => {
        const stats = statsByCategory.get(category.id) as CategoryStats
        const locked = category.unlockRule
          ? (category.unlockRule.category === 'intervals' ? intervalsLevel : 1) <
            category.unlockRule.level
          : false

        return (
          <Card key={category.id} className={locked ? styles.lockedCard : undefined}>
            <div className={styles.row}>
              <div>
                <div className={styles.label}>{category.label}</div>
                <div className={styles.sub}>
                  {locked
                    ? `🔒 ${category.description}`
                    : `Level ${stats.level} · ${
                        stats.attempts > 0 ? `${stats.accuracyPct}% accuracy` : category.description
                      }`}
                </div>
              </div>
              {locked ? (
                <Pill>🔒</Pill>
              ) : (
                <button
                  type="button"
                  className={styles.playButton}
                  onClick={() => navigate(`/tools/ear/drill?category=${category.id}`)}
                >
                  <Pill variant={category.id === 'intervals' ? 'good' : 'accent'}>▶ Play</Pill>
                </button>
              )}
            </div>
            {!locked && stats.attempts > 0 && <ProgressBar value={stats.accuracyPct} />}
          </Card>
        )
      })}
    </div>
  )
}
