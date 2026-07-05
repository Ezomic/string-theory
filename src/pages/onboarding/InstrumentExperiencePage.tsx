import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Button, RadioOption, Segmented } from '../../components/ui'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './OnboardingPage.module.css'

type InstrumentChoice = 'guitar' | 'bass' | 'both'

const EXPERIENCE_OPTIONS = [
  { label: 'Just picked it up', description: 'New to the instrument' },
  { label: 'I play a bit — want to get serious', description: 'Comfortable with the basics' },
  { label: 'Pretty comfortable already', description: 'Know my way around the neck' },
]

// A2 — instrument & experience
export function InstrumentExperiencePage() {
  const navigate = useNavigate()
  const setActiveInstrument = useInstrumentStore((state) => state.setActiveInstrument)
  const [instrument, setInstrument] = useState<InstrumentChoice>('guitar')
  const [experienceIndex, setExperienceIndex] = useState(1)

  function handleContinue() {
    setActiveInstrument(instrument === 'bass' ? 'bass' : 'guitar')
    navigate('/onboarding/account', { state: { experienceIndex } })
  }

  return (
    <div className={styles.page}>
      <AppBar title="" subtitle="Step 1 of 2" onBack={() => navigate(-1)} />

      <h2 className={styles.heading}>What do you play?</h2>
      <p className={styles.subtext}>You can change this any time.</p>
      <Segmented
        options={[
          { value: 'guitar', label: '🎸 Guitar' },
          { value: 'bass', label: '🎵 Bass' },
          { value: 'both', label: 'Both' },
        ]}
        value={instrument}
        onChange={setInstrument}
      />

      <h2 className={styles.heading}>How much have you played?</h2>
      <div className={styles.options}>
        {EXPERIENCE_OPTIONS.map((option, index) => (
          <RadioOption
            key={option.label}
            label={option.label}
            description={option.description}
            selected={experienceIndex === index}
            onSelect={() => setExperienceIndex(index)}
          />
        ))}
      </div>

      <Button onClick={handleContinue}>Continue</Button>
    </div>
  )
}
