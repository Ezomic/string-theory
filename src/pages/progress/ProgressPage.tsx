import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, BigIcon, Button, Card, Heatmap, Pill } from '../../components/ui'
import { getAll, getOne } from '../../lib/db/db'
import type { LessonProgress, Streak } from '../../lib/db/types'
import { buildSkillsList, isProgressEmpty, type SkillDisplay } from '../../lib/progress'
import { getAllPracticeSessions, last28DaysHeatmap, totalPracticeMinutes } from '../../lib/practiceLog'
import styles from './ProgressPage.module.css'

interface ProgressData {
  streak: Streak | undefined
  lessonsCompleted: number
  totalMinutes: number
  heatmap: number[]
  skills: SkillDisplay[]
  empty: boolean
}

// J1 — Progress overview (falls back to the K3 empty state before any practice exists)
export function ProgressPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ProgressData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [streak, lessonProgress, drillResults, skillProgress, sessions] = await Promise.all([
        getOne('streak', 'current'),
        getAll('lessonProgress'),
        getAll('drillResults'),
        getAll('skillProgress'),
        getAllPracticeSessions(),
      ])
      if (cancelled) return

      setData({
        streak,
        lessonsCompleted: lessonProgress.filter((p: LessonProgress) => p.status === 'done').length,
        totalMinutes: totalPracticeMinutes(sessions),
        heatmap: last28DaysHeatmap(sessions),
        skills: buildSkillsList(skillProgress, drillResults),
        empty: isProgressEmpty(sessions),
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) {
    return (
      <div className={styles.page}>
        <AppBar title="Progress" />
      </div>
    )
  }

  if (data.empty) {
    return (
      <div className={styles.page}>
        <AppBar title="Progress" />
        <div className={styles.emptyCol}>
          <BigIcon>🌱</BigIcon>
          <h2 className={styles.emptyHeading}>Nothing here yet</h2>
          <p className={styles.emptyBody}>
            Do your first lesson or drill and your streak, heatmap, and skill progress will start filling in.
          </p>
          <Button onClick={() => navigate('/tools/tuner')}>Start with the tuner 🎯</Button>
          <Button variant="ghost" onClick={() => navigate('/path')}>
            Take a lesson
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppBar
        title="Progress"
        subtitle="You're on a roll"
        trailing={
          <button type="button" className={styles.profileButton} onClick={() => navigate('/progress/profile')} aria-label="Profile">
            👤
          </button>
        }
      />

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{data.streak?.current ?? 0}</div>
          <div className={styles.statLabel}>🔥 Day streak</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{data.lessonsCompleted}</div>
          <div className={styles.statLabel}>Lessons</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{Math.round(data.totalMinutes)}m</div>
          <div className={styles.statLabel}>Practiced</div>
        </div>
      </div>

      <Card>
        <div className={styles.cardHeaderRow}>
          <span className={styles.cardHeaderLabel}>Last 4 weeks</span>
          <span className={styles.cardHeaderHint}>practice minutes</span>
        </div>
        <Heatmap days={data.heatmap} />
      </Card>

      <Card>
        <div className={styles.cardHeaderLabel}>Skills mastered</div>
        {data.skills.length === 0 ? (
          <p className={styles.noSkills}>Keep practicing to start tracking skills.</p>
        ) : (
          data.skills.map((skill) => (
            <button
              key={skill.key}
              type="button"
              className={styles.skillRow}
              onClick={() => navigate(`/progress/skill/${skill.key}`)}
            >
              <span>{skill.label}</span>
              <Pill variant={skill.masteryPct >= 80 ? 'good' : skill.masteryPct >= 40 ? 'default' : 'warn'}>
                {skill.masteryPct}%
              </Pill>
            </button>
          ))
        )}
      </Card>

      <Button variant="ghost" onClick={() => navigate('/progress/achievements')}>
        View achievements 🏅
      </Button>
    </div>
  )
}
