import { useNavigate, useParams } from 'react-router-dom'
import { AppBar, BigIcon, Button, Card } from '../../components/ui'
import { lessonById, unitFor } from '../../lib/curriculum'
import { markLessonInProgress } from '../../lib/pathProgress'
import styles from './LessonIntroPage.module.css'

const STEPS = [
  { icon: '📖', label: 'Read' },
  { icon: '👁', label: 'See' },
  { icon: '🔊', label: 'Hear' },
  { icon: '🎯', label: 'Exercises' },
]

// D2 — lesson intro
export function LessonIntroPage() {
  const navigate = useNavigate()
  const { lessonId } = useParams()
  const lesson = lessonId ? lessonById(lessonId) : undefined

  if (!lesson) {
    return (
      <div className={styles.page}>
        <AppBar title="Lesson" onBack={() => navigate('/path')} />
        <p className={styles.notFound}>Lesson not found.</p>
      </div>
    )
  }

  const unit = unitFor(lesson)

  async function handleStart() {
    await markLessonInProgress(lesson!.id)
    navigate(`/path/lesson/${lesson!.id}/loop`)
  }

  return (
    <div className={styles.page}>
      <AppBar title="" subtitle={`${unit.title} · Lesson ${lesson.order}`} onBack={() => navigate('/path')} />

      <Card className={styles.introCard}>
        <BigIcon>🎼</BigIcon>
        <h2 className={styles.title}>{lesson.title}</h2>
        <p className={styles.concept}>{lesson.concept}</p>
      </Card>

      <p className={styles.sectionLabel}>You'll go through</p>
      <div className={styles.steps}>
        {STEPS.map((step) => (
          <div key={step.label} className={styles.step}>
            <span className={styles.stepIcon}>{step.icon}</span>
            {step.label}
          </div>
        ))}
      </div>

      <div className={styles.metaRow}>
        <span>⏱ ~{lesson.timeEstimateMin} min</span>
        <span>🎸 {lesson.instrumentNote}</span>
      </div>

      <Button onClick={handleStart}>Start lesson</Button>
    </div>
  )
}
