import { afterEach, describe, expect, it, vi } from 'vitest'
import { faviconCandidates, fetchPortalApps, fetchSession, portalSections, signInUrl, type PortalApp } from './portal'

const app = (slug: string): PortalApp => ({ slug, name: slug, initials: slug[0], accent: null, launch_url: `https://${slug}.test/launch` })

afterEach(() => vi.unstubAllGlobals())

describe('portalSections', () => {
  it('puts the main apps first and drops empty sections', () => {
    const sections = portalSections({
      applications: [app('tracker')],
      categories: [
        { category: 'Empty', apps: [] },
        { category: 'Games', apps: [app('valheim')] },
      ],
    })
    expect(sections.map((section) => section.label)).toEqual([null, 'Games'])
  })

  it('drops apps whose launch url is not http(s)', () => {
    const bad = { ...app('evil'), launch_url: 'javascript:alert(1)' }
    expect(portalSections({ applications: [bad, app('tracker')], categories: [{ category: 'X', apps: [bad] }] })).toEqual([
      { key: '__main__', label: null, apps: [app('tracker')] },
    ])
  })

  it('returns nothing when there are no apps', () => {
    expect(portalSections({ applications: [], categories: [] })).toEqual([])
  })
})

describe('faviconCandidates', () => {
  it('tries svg before ico on the launch origin', () => {
    expect(faviconCandidates('https://tracker.test/portal/launch/1')).toEqual(['https://tracker.test/favicon.svg', 'https://tracker.test/favicon.ico'])
  })

  it('gives up on an invalid url', () => {
    expect(faviconCandidates('not a url')).toEqual([])
  })
})

describe('signInUrl', () => {
  it('encodes the return path', () => {
    expect(signInUrl('/tools?x=1')).toBe('/auth/sso/redirect?return=%2Ftools%3Fx%3D1')
  })
})

describe('portal requests', () => {
  it('treats a network failure as signed out rather than throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchSession()).toBeNull()
    expect(await fetchPortalApps()).toBeNull()
  })

  it('returns the session body when the backend answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ configured: true, user: null })))
    expect(await fetchSession()).toEqual({ configured: true, user: null })
  })

  it('returns null for an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })))
    expect(await fetchPortalApps()).toBeNull()
  })
})
