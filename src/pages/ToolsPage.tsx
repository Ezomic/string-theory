import { useNavigate } from 'react-router-dom'
import { AppBar, Pill } from '../components/ui'
import { TOOLS } from '../lib/tools'
import styles from './ToolsPage.module.css'

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
