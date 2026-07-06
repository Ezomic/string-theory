import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, BigIcon, Card, Pill } from '../../components/ui'
import { getAll, getOne } from '../../lib/db/db'
import type { PlacementResult, UserProfile } from '../../lib/db/types'
import { buildExportData, downloadExport } from '../../lib/exportData'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './ProfilePage.module.css'

const INSTRUMENT_PILL: Record<string, string> = {
  guitar: '🎸 Guitar',
  bass: '🎵 Bass',
}

// K2 — Profile / account
export function ProfilePage() {
  const navigate = useNavigate()
  const activeInstrument = useInstrumentStore((state) => state.activeInstrument)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [level, setLevel] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    Promise.all([getOne('profile', 'local-guest'), getAll('placementResults')]).then(([p, placements]) => {
      setProfile(p ?? null)
      const latest = placements.sort((a: PlacementResult, b: PlacementResult) => b.takenAt.localeCompare(a.takenAt))[0]
      setLevel(latest?.level ?? null)
    })
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      downloadExport(await buildExportData())
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.page}>
      <AppBar title="" subtitle="Profile" onBack={() => navigate('/progress')} />

      <Card className={styles.headerCard}>
        <BigIcon>🧑‍🎤</BigIcon>
        <h2 className={styles.name}>{profile?.name ?? 'Guest'}</h2>
        <p className={styles.email}>{profile?.email ?? 'Not signed in'}</p>
        <div className={styles.pillRow}>
          <Pill>{INSTRUMENT_PILL[activeInstrument]}</Pill>
          {level !== null && <Pill variant="accent">Level {level}</Pill>}
        </div>
      </Card>

      <Card className={styles.listCard}>
        <button type="button" className={styles.row} onClick={() => navigate('/settings')}>
          <span>Settings</span>
          <span className={styles.chevron}>›</span>
        </button>
        <button type="button" className={styles.row} disabled>
          <span>Plan</span>
          <span className={styles.chevron}>Free ›</span>
        </button>
        <button type="button" className={styles.row} disabled>
          <span>Reminders &amp; email</span>
          <span className={styles.chevron}>›</span>
        </button>
        <button type="button" className={styles.row} onClick={() => void handleExport()} disabled={exporting}>
          <span>Export practice data</span>
          <span className={styles.chevron}>{exporting ? 'Exporting…' : '›'}</span>
        </button>
        <button type="button" className={[styles.row, styles.danger].join(' ')} disabled>
          <span>Sign out</span>
          <span className={styles.chevron}>›</span>
        </button>
      </Card>
      <p className={styles.guestNote}>
        You're using String Theory as a guest — everything is stored on this device. Accounts and sync aren't
        available yet, but you can export a full copy of your data any time.
      </p>
    </div>
  )
}
