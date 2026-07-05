import { useNavigate } from 'react-router-dom'
import { AppBar, Pill } from '../components/ui'
import styles from './ToolsPage.module.css'

interface Tool {
  icon: string
  label: string
  path: string | null
}

const TOOLS: Tool[] = [
  { icon: '🎯', label: 'Tuner', path: '/tools/tuner' },
  { icon: '🎸', label: 'Fretboard', path: null },
  { icon: '👂', label: 'Ear', path: null },
  { icon: '🎼', label: 'Play & check', path: null },
  { icon: '📈', label: 'Progress', path: null },
  { icon: '🔀', label: 'Daily mix', path: null },
]

// C1's Toolbox grid, promoted to its own Tools-tab destination
export function ToolsPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <AppBar title="Practice tools" subtitle="No lesson needed" />
      <div className={styles.grid}>
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            className={styles.tool}
            disabled={!tool.path}
            onClick={() => tool.path && navigate(tool.path)}
          >
            <span className={styles.icon}>{tool.icon}</span>
            {tool.label}
            {!tool.path && (
              <Pill className={styles.soonPill}>Soon</Pill>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
