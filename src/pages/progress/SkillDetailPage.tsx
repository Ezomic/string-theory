import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppBar, BigIcon, Button, Card, Pill } from '../../components/ui'
import { getAll } from '../../lib/db/db'
import type { DrillResult, SkillProgress } from '../../lib/db/types'
import { DRILL_CATEGORIES, statsForCategory, type DrillCategory } from '../../lib/earTraining'
import { skillMetaFor } from '../../lib/progress'
import styles from './SkillDetailPage.module.css'

const SKILL_ICON: Record<string, string> = {
  fretboardNotes: '🎸',
  play: '🎼',
  intervals: '👂',
  chordQuality: '👂',
  scaleRecognition: '👂',
  progressions: '👂',
}

function bandLabel(pct: number): { label: string; variant: 'good' | 'default' | 'warn' } {
  if (pct >= 80) return { label: 'Solid', variant: 'good' }
  if (pct >= 50) return { label: 'Good', variant: 'default' }
  return { label: 'Shaky', variant: 'warn' }
}

function isEarDrillCategory(skillKey: string): skillKey is DrillCategory {
  return DRILL_CATEGORIES.some((c) => c.id === skillKey)
}

interface SkillState {
  skillProgress: SkillProgress | null
  drillResults: DrillResult[]
}

// J3 — Skill detail (drill-down + jump to practice)
export function SkillDetailPage() {
  const navigate = useNavigate()
  const { skillKey } = useParams()
  const [state, setState] = useState<SkillState | undefined>(undefined)

  useEffect(() => {
    if (!skillKey) return
    Promise.all([getAll('skillProgress'), getAll('drillResults')]).then(([allSkills, allResults]) => {
      setState({
        skillProgress: allSkills.find((s) => s.skillKey === skillKey) ?? null,
        drillResults: allResults,
      })
    })
  }, [skillKey])

  const meta = skillKey ? skillMetaFor(skillKey) : undefined

  if (state === undefined || !skillKey || !meta) {
    return (
      <div className={styles.page}>
        <AppBar title="Skill" onBack={() => navigate('/progress')} />
      </div>
    )
  }

  // Ear-drill categories never get their own SkillProgress row — their mastery lives in
  // DrillResult accuracy instead (the same source Progress's J1 skills list reads from).
  const masteryPct = isEarDrillCategory(skillKey)
    ? statsForCategory(state.drillResults, skillKey).accuracyPct
    : (state.skillProgress?.masteryPct ?? 0)
  const breakdown = state.skillProgress?.perStringBreakdown

  return (
    <div className={styles.page}>
      <AppBar title="" subtitle="Skill" onBack={() => navigate('/progress')} />

      <Card className={styles.headerCard}>
        <BigIcon>{SKILL_ICON[skillKey] ?? '🎯'}</BigIcon>
        <h2 className={styles.title}>{meta.label}</h2>
        <p className={styles.lead}>You're at {masteryPct}% mastery on this skill.</p>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${Math.min(100, masteryPct)}%` }} />
        </div>
      </Card>

      {breakdown && Object.keys(breakdown).length > 0 && (
        <>
          <p className={styles.sectionLabel}>By string</p>
          <Card className={styles.breakdownCard}>
            {Object.entries(breakdown).map(([label, pct]) => {
              const band = bandLabel(pct)
              return (
                <div key={label} className={styles.row}>
                  <span>{label}</span>
                  <Pill variant={band.variant}>{band.label}</Pill>
                </div>
              )
            })}
          </Card>
        </>
      )}

      <Button onClick={() => navigate(meta.route)}>Drill the weak spots 🎯</Button>
    </div>
  )
}
