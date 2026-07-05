import { useNavigate } from 'react-router-dom'
import { AppBar, BigIcon, Button } from '../components/ui'
import styles from './ComingSoonPage.module.css'

interface ComingSoonPageProps {
  title: string
  icon: string
  body: string
}

export function ComingSoonPage({ title, icon, body }: ComingSoonPageProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <AppBar title={title} />
      <div className={styles.centerCol}>
        <BigIcon>{icon}</BigIcon>
        <h2 className={styles.heading}>Coming in a later milestone</h2>
        <p className={styles.body}>{body}</p>
        <Button onClick={() => navigate('/tools/tuner')}>Try the tuner 🎯</Button>
      </div>
    </div>
  )
}
