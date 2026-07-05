import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Card, Pill } from '../components/ui'
import { getAll, getOne } from '../lib/db/db'
import type { CurriculumLesson } from '../lib/curriculum'
import { lessonsInUnit, unitFor } from '../lib/curriculum'
import { findCurrentLesson, getAllLessonProgress } from '../lib/pathProgress'
import { TOOLS } from '../lib/tools'
import type { PlacementResult, Streak, UserProfile } from '../lib/db/types'
import styles from './HomePage.module.css'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

interface HomeData {
  profile: UserProfile | undefined
  streak: Streak | undefined
  level: number
  currentLesson: CurriculumLesson | undefined
  unitDoneCount: number
  unitTotalCount: number
}

// C1 — Home hub
export function HomePage() {
  const navigate = useNavigate()
  const [data, setData] = useState<HomeData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [profile, streak, progressMap, placements] = await Promise.all([
        getOne('profile', 'local-guest'),
        getOne('streak', 'current'),
        getAllLessonProgress(),
        getAll('placementResults'),
      ])
      if (cancelled) return

      // Empty means placement was never finished (or skipped) for this profile —
      // send them to finish it instead of showing a misleading "all caught up".
      if (Object.keys(progressMap).length === 0) {
        navigate('/placement', { replace: true })
        return
      }

      const currentLesson = findCurrentLesson(progressMap)
      const latestPlacement = placements.sort((a: PlacementResult, b: PlacementResult) =>
        b.takenAt.localeCompare(a.takenAt),
      )[0]
      const unitLessons = currentLesson ? lessonsInUnit(unitFor(currentLesson).id) : []
      const unitDoneCount = unitLessons.filter((l) => progressMap[l.id]?.status === 'done').length

      setData({
        profile,
        streak,
        level: latestPlacement?.level ?? 1,
        currentLesson,
        unitDoneCount,
        unitTotalCount: unitLessons.length,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [navigate])

  if (!data) {
    return (
      <div className={styles.page}>
        <AppBar title="String Theory" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppBar title={`${greeting()}, ${data.profile?.name ?? 'there'} 👋`} />

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {data.streak?.current ?? 0}
            <span className={styles.statUnit}> d</span>
          </div>
          <div className={styles.statLabel}>🔥 Streak</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>Lvl {data.level}</div>
          <div className={styles.statLabel}>Theory</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {data.unitDoneCount}
            <span className={styles.statUnit}>/{data.unitTotalCount}</span>
          </div>
          <div className={styles.statLabel}>This unit</div>
        </div>
      </div>

      <Card className={styles.pathDoor}>
        <Pill className={styles.pathPill}>The Path</Pill>
        {data.currentLesson ? (
          <>
            <h4 className={styles.pathTitle}>{data.currentLesson.title}</h4>
            <p className={styles.pathLead}>
              {data.currentLesson.timeEstimateMin} min · read → see → hear → play
            </p>
            <button
              type="button"
              className={styles.pathButton}
              onClick={() => navigate(`/path/lesson/${data.currentLesson!.id}`)}
            >
              Continue lesson →
            </button>
          </>
        ) : (
          <>
            <h4 className={styles.pathTitle}>You're all caught up!</h4>
            <p className={styles.pathLead}>More lessons are on the way.</p>
          </>
        )}
      </Card>

      <Card className={styles.toolsDoor}>
        <div className={styles.toolsHeader}>
          <h4>Practice tools</h4>
          <span className={styles.toolsHint}>no lesson needed</span>
        </div>
        <div className={styles.toolGrid}>
          {TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              className={styles.tool}
              disabled={!tool.path}
              onClick={() => tool.path && navigate(tool.path)}
            >
              <span className={styles.toolIcon}>{tool.icon}</span>
              {tool.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
