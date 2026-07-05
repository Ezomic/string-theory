import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../../components/ui'
import { ACHIEVEMENTS, computeEarnedAchievements, loadAchievementInput } from '../../lib/achievements'
import styles from './AchievementsPage.module.css'

// J2 — Achievements
export function AchievementsPage() {
  const navigate = useNavigate()
  const [earned, setEarned] = useState<Set<string> | null>(null)

  useEffect(() => {
    loadAchievementInput().then((input) => setEarned(computeEarnedAchievements(input)))
  }, [])

  return (
    <div className={styles.page}>
      <AppBar
        title="Achievements"
        subtitle={earned ? `${earned.size} of ${ACHIEVEMENTS.length} earned` : undefined}
        onBack={() => navigate('/progress')}
      />

      <div className={styles.grid}>
        {ACHIEVEMENTS.map((achievement) => {
          const locked = !earned?.has(achievement.key)
          return (
            <div key={achievement.key} className={[styles.badge, locked ? styles.locked : ''].filter(Boolean).join(' ')}>
              <span className={styles.emoji}>{locked ? '🔒' : achievement.icon}</span>
              {achievement.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
