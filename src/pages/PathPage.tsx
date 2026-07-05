import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Pill } from '../components/ui'
import { UNITS, lessonsInUnit } from '../lib/curriculum'
import { getAllLessonProgress } from '../lib/pathProgress'
import type { LessonProgress, LessonStatus } from '../lib/db/types'
import styles from './PathPage.module.css'

const BUBBLE: Record<LessonStatus, string> = {
  done: '✓',
  in_progress: '▶',
  available: '▶',
  locked: '🔒',
}

function subtitleFor(status: LessonStatus, progress: LessonProgress | undefined): string {
  if (status === 'done') return `Completed · ${progress?.score ?? 100}%`
  if (status === 'in_progress') return 'In progress — pick up here'
  if (status === 'available') return 'Ready to start'
  return 'Locked'
}

// D1 — Path overview
export function PathPage() {
  const navigate = useNavigate()
  const [progressMap, setProgressMap] = useState<Record<string, LessonProgress> | null>(null)

  useEffect(() => {
    getAllLessonProgress().then(setProgressMap)
  }, [])

  if (!progressMap) {
    return (
      <div className={styles.page}>
        <AppBar title="Your Path" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppBar title="Your Path" />

      {UNITS.map((unit) => {
        const lessons = lessonsInUnit(unit.id)
        const doneCount = lessons.filter((l) => progressMap[l.id]?.status === 'done').length

        return (
          <div key={unit.id}>
            <div className={styles.unitHeader}>
              <span className={styles.unitLevel}>UNIT {unit.order}</span>
              <span className={styles.unitTitle}>{unit.title}</span>
              {doneCount > 0 && (
                <Pill variant="good" className={styles.unitPill}>
                  {doneCount}/{lessons.length}
                </Pill>
              )}
            </div>

            {lessons.map((lesson) => {
              const status = progressMap[lesson.id]?.status ?? 'locked'
              const locked = status === 'locked'
              return (
                <button
                  key={lesson.id}
                  type="button"
                  className={[styles.lesson, locked ? styles.locked : '', status === 'in_progress' ? styles.current : '']
                    .filter(Boolean)
                    .join(' ')}
                  disabled={locked}
                  onClick={() => navigate(`/path/lesson/${lesson.id}`)}
                >
                  <span className={[styles.bubble, styles[status]].join(' ')}>{BUBBLE[status]}</span>
                  <span className={styles.lessonText}>
                    <span className={styles.lessonTitle}>{lesson.title}</span>
                    <span className={styles.lessonSubtitle}>{subtitleFor(status, progressMap[lesson.id])}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
