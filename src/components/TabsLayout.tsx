import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav, type BottomNavTab } from './ui'

const TAB_FOR_PATH: { prefix: string; tab: BottomNavTab }[] = [
  { prefix: '/path', tab: 'path' },
  { prefix: '/tools', tab: 'tools' },
  { prefix: '/progress', tab: 'progress' },
]

const PATH_FOR_TAB: Record<BottomNavTab, string> = {
  home: '/',
  path: '/path',
  tools: '/tools',
  progress: '/progress',
}

function tabForPath(pathname: string): BottomNavTab {
  return TAB_FOR_PATH.find((entry) => pathname.startsWith(entry.prefix))?.tab ?? 'home'
}

export function TabsLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <Outlet />
      <BottomNav active={tabForPath(location.pathname)} onSelect={(tab) => navigate(PATH_FOR_TAB[tab])} />
    </>
  )
}
