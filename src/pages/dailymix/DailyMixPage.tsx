import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Button, Card, Pill } from '../../components/ui'
import { getAll } from '../../lib/db/db'
import { buildDailyMix, getCompletedMixSteps, markMixStepDone, type DailyMixStep } from '../../lib/dailyMix'
import { buildSkillsList } from '../../lib/progress'
import styles from './DailyMixPage.module.css'

// C2 — Daily mix: a ~10 min blended session, one tap to continue through each step
export function DailyMixPage() {
  const navigate = useNavigate()
  const [steps, setSteps] = useState<DailyMixStep[] | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([getAll('skillProgress'), getAll('drillResults')]).then(([skillProgress, drillResults]) => {
      setSteps(buildDailyMix(buildSkillsList(skillProgress, drillResults)))
      setDone(getCompletedMixSteps())
    })
  }, [])

  if (!steps) {
    return (
      <div className={styles.page}>
        <AppBar title="Daily mix" onBack={() => navigate('/home')} />
      </div>
    )
  }

  const currentIndex = steps.findIndex((s) => !done.has(s.id))
  const allDone = currentIndex === -1

  function continueMix() {
    const step = steps![currentIndex]
    markMixStepDone(step.id)
    setDone(getCompletedMixSteps())
    navigate(step.route)
  }

  return (
    <div className={styles.page}>
      <AppBar title="Daily mix" subtitle="~10 min · tuned to your weak spots" onBack={() => navigate('/home')} />

      {steps.map((step, index) => {
        const isDone = done.has(step.id)
        const isCurrent = index === currentIndex
        return (
          <Card key={step.id} className={styles.stepCard}>
            <div className={styles.row}>
              <span className={[styles.bubble, isDone ? styles.bubbleDone : isCurrent ? styles.bubbleNow : ''].filter(Boolean).join(' ')}>
                {isDone ? '✓' : index + 1}
              </span>
              <div className={styles.text}>
                <div className={styles.title}>{step.title}</div>
                <div className={styles.subtitle}>{step.subtitle}</div>
              </div>
              {isDone && <Pill variant="good">✓</Pill>}
              {isCurrent && <Pill variant="accent">Now</Pill>}
            </div>
          </Card>
        )
      })}

      {allDone ? (
        <p className={styles.doneMessage}>Nice work — you've been through the whole mix today. 🎉</p>
      ) : (
        <Button onClick={continueMix}>Continue mix →</Button>
      )}
    </div>
  )
}
