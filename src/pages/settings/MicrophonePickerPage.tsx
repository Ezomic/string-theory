import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Button, RadioOption } from '../../components/ui'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import styles from './MicrophonePickerPage.module.css'

type LoadState = 'loading' | 'ready' | 'denied'

// Settings > Audio & mic > Microphone — lets you pick an audio interface / guitar-to-USB
// adapter instead of the OS default input, so String Theory can hear a direct instrument
// signal rather than only an acoustic mic pickup.
export function MicrophonePickerPage() {
  const navigate = useNavigate()
  const micDeviceId = useAudioSettingsStore((state) => state.micDeviceId)
  const setMicDeviceId = useAudioSettingsStore((state) => state.setMicDeviceId)

  const [state, setState] = useState<LoadState>('loading')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Device labels are only populated once permission has been granted at least
        // once — request it here (briefly) purely to unlock readable device names.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        const all = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        setDevices(all.filter((d) => d.kind === 'audioinput'))
        setState('ready')
      } catch {
        if (!cancelled) setState('denied')
      }
    }

    setState('loading')
    load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  function select(deviceId: string | null) {
    setMicDeviceId(deviceId)
    navigate('/settings')
  }

  return (
    <div className={styles.page}>
      <AppBar title="Microphone" onBack={() => navigate('/settings')} />

      {state === 'loading' && <p className={styles.hint}>Looking for audio inputs…</p>}

      {state === 'denied' && (
        <>
          <p className={styles.hint}>
            Microphone access is needed to list your audio inputs (like a USB interface or guitar-to-USB adapter).
          </p>
          <Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
        </>
      )}

      {state === 'ready' && (
        <div className={styles.list}>
          <RadioOption
            label="System default"
            description="Whatever your OS considers the default microphone"
            selected={micDeviceId === null}
            onSelect={() => select(null)}
          />
          {devices.map((device) => (
            <RadioOption
              key={device.deviceId}
              label={device.label || 'Unnamed input'}
              selected={micDeviceId === device.deviceId}
              onSelect={() => select(device.deviceId)}
            />
          ))}
          {devices.length === 0 && (
            <p className={styles.hint}>
              No other inputs found — plug in a USB audio interface or guitar-to-USB cable and reopen this screen.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
