export interface PortalApp {
  slug: string
  name: string
  initials: string
  accent: string | null
  launch_url: string
}

export interface PortalCategory {
  category: string
  apps: PortalApp[]
}

export interface PortalSession {
  configured: boolean
  user: { name: string; email: string } | null
}

export interface PortalData {
  applications: PortalApp[]
  categories: PortalCategory[]
  currentSlug: string
}

export interface PortalSection {
  key: string
  label: string | null
  apps: PortalApp[]
}

export async function fetchSession(): Promise<PortalSession | null> {
  try {
    const response = await fetch('/api/session', { credentials: 'same-origin' })
    if (!response.ok) return null
    const body = (await response.json()) as PortalSession
    return typeof body.configured === 'boolean' ? body : null
  } catch {
    return null
  }
}

export async function fetchPortalApps(): Promise<PortalData | null> {
  try {
    const response = await fetch('/api/portal/apps', { credentials: 'same-origin' })
    return response.ok ? ((await response.json()) as PortalData) : null
  } catch {
    return null
  }
}

export async function signOutOfPortal(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined)
}

export function signInUrl(returnTo: string): string {
  return `/auth/sso/redirect?return=${encodeURIComponent(returnTo)}`
}

export function portalSections(data: Pick<PortalData, 'applications' | 'categories'>): PortalSection[] {
  return [
    { key: '__main__', label: null, apps: data.applications },
    ...data.categories.map((group) => ({ key: group.category, label: group.category, apps: group.apps })),
  ].filter((section) => section.apps.length > 0)
}

export function faviconCandidates(launchUrl: string): string[] {
  try {
    const origin = new URL(launchUrl).origin
    return [`${origin}/favicon.svg`, `${origin}/favicon.ico`]
  } catch {
    return []
  }
}
