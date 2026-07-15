import { useNavigate } from 'react-router-dom'
import { AppBar, Pill } from '../../components/ui'
import { ROUTINES, routineTempoRange } from '../../lib/routines'
import styles from './RoutineLibraryPage.module.css'

export function RoutineLibraryPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <AppBar title="Routines" subtitle="Guided practice sessions" onBack={() => navigate('/tools')} />

      <div className={styles.list}>
        {ROUTINES.map((routine) => {
          const { min, max } = routineTempoRange(routine)
          return (
            <button
              key={routine.id}
              type="button"
              className={styles.opt}
              onClick={() => navigate(`/tools/routines/${routine.id}`)}
            >
              <span className={styles.optIcon}>🔁</span>
              <span className={styles.optText}>
                <span className={styles.optTitle}>{routine.title}</span>
                <span className={styles.optSub}>{routine.subtitle}</span>
              </span>
              <span className={styles.pills}>
                <Pill>{routine.steps.length} steps</Pill>
                <Pill variant="default">♩ {min === max ? max : `${min}–${max}`}</Pill>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
