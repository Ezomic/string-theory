export interface ToolInfo {
  icon: string
  label: string
  path: string | null
}

export const TOOLS: ToolInfo[] = [
  { icon: '🎯', label: 'Tuner', path: '/tools/tuner' },
  { icon: '🎸', label: 'Fretboard', path: '/tools/fretboard' },
  { icon: '👂', label: 'Ear', path: '/tools/ear' },
  { icon: '🎼', label: 'Play & check', path: '/tools/play' },
  { icon: '📈', label: 'Progress', path: '/progress' },
  { icon: '🔀', label: 'Daily mix', path: '/daily-mix' },
]
