import styles from './BottomNav.module.css'

export type BottomNavTab = 'home' | 'path' | 'tools' | 'progress'

const TABS: { key: BottomNavTab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'path', label: 'Path', icon: '🧭' },
  { key: 'tools', label: 'Tools', icon: '🧰' },
  { key: 'progress', label: 'Progress', icon: '📈' },
]

interface BottomNavProps {
  active: BottomNavTab
  onSelect: (tab: BottomNavTab) => void
}

export function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={[styles.tab, tab.key === active ? styles.active : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(tab.key)}
        >
          <span className={styles.icon}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
