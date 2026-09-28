import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Card, SectionLabel, Toggle } from '../../components/ui'
import { requestReminderPermission } from '../../lib/dailyReminder'
import type { NotationLabels } from '../../lib/db/types'
import { accountsAvailable } from '../../lib/sync/adapter'
import { formatLastSynced } from '../../lib/sync/formatLastSynced'
import { tuningsFor } from '../../lib/tunings'
import { useAccountStore } from '../../store/accountStore'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { useInstrumentStore } from '../../store/instrumentStore'
import { useSyncStore, type SyncStatus } from '../../store/syncStore'
import styles from './SettingsPage.module.css'

const CALIBRATION_OPTIONS = [438, 439, 440, 441, 442]
const NOTATION_LABEL_OPTIONS: readonly NotationLabels[] = ['names', 'degrees', 'solfege']
const NOTATION_LABEL_TITLES: Record<NotationLabels, string> = {
  names: 'Note names',
  degrees: 'Intervals',
  solfege: 'Solfège',
}

function nextInCycle<T>(options: readonly T[], current: T): T {
  const index = options.indexOf(current)
  return options[(index + 1) % options.length]
}

// K1 — Settings
export function SettingsPage() {
  const navigate = useNavigate()

  const activeInstrument = useInstrumentStore((state) => state.activeInstrument)
  const setActiveInstrument = useInstrumentStore((state) => state.setActiveInstrument)
  const configs = useInstrumentStore((state) => state.configs)
  const setLeftHanded = useInstrumentStore((state) => state.setLeftHanded)
  const setReferencePitch = useInstrumentStore((state) => state.setReferencePitch)

  const micDeviceId = useAudioSettingsStore((state) => state.micDeviceId)
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const setNotationLabels = useAudioSettingsStore((state) => state.setNotationLabels)
  const reminderOn = useAudioSettingsStore((state) => state.reminderOn)
  const setReminderOn = useAudioSettingsStore((state) => state.setReminderOn)
  const noInstrument = useAudioSettingsStore((state) => state.noInstrument)
  const setNoInstrument = useAudioSettingsStore((state) => state.setNoInstrument)

  const session = useAccountStore((state) => state.session)
  const signOut = useAccountStore((state) => state.signOut)

  const syncEnabled = useSyncStore((state) => state.enabled)
  const setSyncEnabled = useSyncStore((state) => state.setEnabled)
  const syncStatus = useSyncStore((state) => state.status)
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt)
  const syncNow = useSyncStore((state) => state.sync)
  const syncStatusLabel = SYNC_STATUS_LABELS[syncStatus]

  const [micLabel, setMicLabel] = useState('System default')
  const [reminderBlocked, setReminderBlocked] = useState(false)

  useEffect(() => {
    if (!micDeviceId) {
      setMicLabel('System default')
      return
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const match = devices.find((d) => d.deviceId === micDeviceId)
        setMicLabel(match?.label || 'Custom device')
      })
      .catch(() => setMicLabel('Custom device'))
  }, [micDeviceId])

  function cycleInstrument() {
    setActiveInstrument(activeInstrument === 'guitar' ? 'bass' : 'guitar')
  }

  function calibrate() {
    const next = nextInCycle(CALIBRATION_OPTIONS, Math.round(configs[activeInstrument].referencePitch))
    setReferencePitch('guitar', next)
    setReferencePitch('bass', next)
  }

  async function handleReminderToggle(checked: boolean) {
    if (!checked) {
      setReminderOn(false)
      setReminderBlocked(false)
      return
    }
    const permission = await requestReminderPermission()
    setReminderOn(permission === 'granted')
    setReminderBlocked(permission !== 'granted')
  }

  return (
    <div className={styles.page}>
      <AppBar title="Settings" onBack={() => navigate('/progress/profile')} />

      <SectionLabel>Instrument</SectionLabel>
      <Card className={styles.card}>
        <button type="button" className={styles.row} onClick={cycleInstrument}>
          <span>Default instrument</span>
          <span className={styles.value}>{activeInstrument === 'guitar' ? 'Guitar' : 'Bass'} ›</span>
        </button>
        <button type="button" className={styles.row} onClick={() => navigate('/tools/tuner/tunings')}>
          <span>Tuning</span>
          <span className={styles.value}>
            {tuningsFor(activeInstrument).find((t) => t.preset === configs[activeInstrument].tuningPreset)?.label ??
              'Custom'}{' '}
            ›
          </span>
        </button>
        <div className={styles.row}>
          <span>Left-handed</span>
          <Toggle
            checked={configs[activeInstrument].leftHanded}
            onChange={(checked) => setLeftHanded(activeInstrument, checked)}
          />
        </div>
      </Card>

      <SectionLabel>Learning</SectionLabel>
      <Card className={styles.card}>
        <button
          type="button"
          className={styles.row}
          onClick={() => setNotationLabels(nextInCycle(NOTATION_LABEL_OPTIONS, notationLabels))}
        >
          <span>Notation labels</span>
          <span className={styles.value}>{NOTATION_LABEL_TITLES[notationLabels]} ›</span>
        </button>
        <button type="button" className={styles.row} onClick={() => navigate('/placement')}>
          <span>Retake placement check</span>
          <span className={styles.value}>›</span>
        </button>
        <div className={styles.row}>
          <span>Daily reminder</span>
          <Toggle checked={reminderOn} onChange={(checked) => void handleReminderToggle(checked)} />
        </div>
      </Card>
      {reminderBlocked && (
        <p className={styles.note}>
          Notifications are blocked for this site — enable them in your browser settings to turn reminders on.
        </p>
      )}

      <SectionLabel>Audio &amp; mic</SectionLabel>
      <Card className={styles.card}>
        <button type="button" className={styles.row} onClick={() => navigate('/settings/microphone')}>
          <span>Microphone</span>
          <span className={styles.value}>{micLabel} ›</span>
        </button>
        <button type="button" className={styles.row} onClick={calibrate}>
          <span>Calibrate tuner</span>
          <span className={styles.value}>A = {Math.round(configs[activeInstrument].referencePitch)} Hz ›</span>
        </button>
        <div className={styles.row}>
          <span>No-instrument mode</span>
          <Toggle checked={noInstrument} onChange={setNoInstrument} />
        </div>
      </Card>
      <p className={styles.note}>
        No instrument or mic handy? Lessons and Master tests skip the Play-along items and run on Hear and Quiz alone.
      </p>

      <SectionLabel>Account &amp; sync</SectionLabel>
      <Card className={styles.card}>
        <div className={styles.row}>
          <span>Account</span>
          <span className={styles.value}>{session ? session.email : 'Guest'}</span>
        </div>

        {session ? (
          <>
            <div className={styles.row}>
              <span>Sync across devices</span>
              <Toggle checked={syncEnabled} onChange={setSyncEnabled} />
            </div>
            <div className={styles.row}>
              <span>Last synced</span>
              <span className={styles.value}>
                {formatLastSynced(lastSyncedAt)}
                {syncStatusLabel ? <span className={styles.syncBadge}>{syncStatusLabel}</span> : null}
              </span>
            </div>
            <button
              type="button"
              className={styles.row}
              onClick={() => void syncNow()}
              disabled={!syncEnabled || syncStatus === 'syncing'}
            >
              <span>Sync now</span>
              <span className={styles.value}>{syncStatus === 'syncing' ? 'Syncing…' : '›'}</span>
            </button>
            <button type="button" className={styles.row} onClick={() => void signOut()}>
              <span>Log out</span>
              <span className={styles.value}>›</span>
            </button>
          </>
        ) : accountsAvailable() ? (
          <button
            type="button"
            className={styles.row}
            onClick={() => navigate('/onboarding/account')}
          >
            <span>Create an account</span>
            <span className={styles.value}>Keep your progress safe ›</span>
          </button>
        ) : (
          <div className={[styles.row, styles.disabledRow].join(' ')}>
            <span>Sync across devices</span>
            <Toggle checked={false} onChange={() => {}} />
          </div>
        )}
      </Card>
      <p className={styles.note}>{syncNote(Boolean(session), accountsAvailable(), syncEnabled)}</p>

      <SectionLabel>App</SectionLabel>
      <Card className={styles.card}>
        <div className={styles.row}>
          <span>Theme</span>
          <span className={styles.valueMuted}>Dark (only option for now)</span>
        </div>
      </Card>
    </div>
  )
}

const SYNC_STATUS_LABELS: Partial<Record<SyncStatus, string>> = {
  syncing: 'Syncing',
  offline: 'Offline',
  error: 'Sync failed',
}

function syncNote(signedIn: boolean, available: boolean, enabled: boolean): string {
  if (!available) return "Sync needs an account, which isn't available yet. Everything stays on this device."
  if (!signedIn) return 'Your progress lives on this device only. An account keeps it safe and syncs it across devices.'
  if (!enabled) return 'Sync is off, so nothing leaves this device until you turn it back on.'
  return 'Your progress syncs automatically when you open the app and after you practise.'
}
