import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { configFromEnv, createApp, type ServerConfig } from './index.ts'
import { readCookie, sign, verify } from './session.ts'

const config: ServerConfig = {
  idUrl: 'https://id.test',
  clientId: 'client-1',
  clientSecret: 'shh',
  appUrl: 'https://string-theory.test',
  sessionSecret: 'session-secret-of-at-least-32-chars',
  appSlug: 'string-theory',
}

const apps = {
  applications: [{ slug: 'tracker', name: 'Tracker', initials: 'T', accent: '#123456', launch_url: 'https://tracker.test/launch' }],
  categories: [],
}

function fakeId(calls: { url: string; body: string }[] = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const body = String(init?.body ?? '')
    calls.push({ url, body })
    if (url.endsWith('/oauth/token') && body.includes('authorization_code')) return Response.json({ access_token: 'user-token' })
    if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'app-token', expires_in: 900 })
    if (url.endsWith('/api/userinfo')) return Response.json({ sub: '1', name: 'Rob', email: 'rob@example.test' })
    if (url.endsWith('/api/portal/apps')) return Response.json(apps)
    return new Response('nope', { status: 404 })
  }) as typeof fetch
}

const servers: ReturnType<typeof createApp>[] = []

async function start(cfg: ServerConfig | null, fetchImpl: typeof fetch = fakeId()): Promise<string> {
  const server = createApp(cfg, fetchImpl)
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterEach(() => {
  servers.splice(0).forEach((server) => server.close())
})

function cookiesOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

async function signIn(origin: string): Promise<string> {
  const start = await fetch(`${origin}/auth/sso/redirect?return=/tools`, { redirect: 'manual' })
  const authorize = new URL(start.headers.get('location')!)
  const callback = await fetch(`${origin}/auth/sso/callback?code=abc&state=${authorize.searchParams.get('state')}`, {
    redirect: 'manual',
    headers: { cookie: cookiesOf(start) },
  })
  expect(callback.headers.get('location')).toBe('/tools')
  return cookiesOf(callback)
}

describe('session tokens', () => {
  it('round-trips a payload and rejects tampering and expiry', () => {
    const token = sign('s', 'session', { email: 'a@b.test' }, 60, 1000)
    expect(verify<{ email: string }>('s', 'session', token, 2000)?.email).toBe('a@b.test')
    expect(verify('other', 'session', token, 2000)).toBeNull()
    expect(verify('s', 'session', `${token}x`, 2000)).toBeNull()
    expect(verify('s', 'session', token, 1000 + 61_000)).toBeNull()
    expect(verify('s', 'session', undefined)).toBeNull()
    expect(verify('s', 'sso', token, 2000)).toBeNull()
  })

  it('reads a named cookie', () => {
    expect(readCookie('a=1; b=2=3', 'b')).toBe('2=3')
    expect(readCookie(undefined, 'a')).toBeUndefined()
  })
})

describe('configFromEnv', () => {
  it('is null unless every setting is present', () => {
    const env = {
      THIJSSENSOFTWARE_ID_URL: 'https://id.test',
      THIJSSENSOFTWARE_ID_CLIENT_ID: 'c',
      THIJSSENSOFTWARE_ID_CLIENT_SECRET: 's',
      APP_URL: 'https://app.test/',
    }
    expect(configFromEnv({})).toBeNull()
    expect(configFromEnv({ ...env, SESSION_SECRET: 'x'.repeat(32) })?.appUrl).toBe('https://app.test')
    expect(configFromEnv({ ...env, SESSION_SECRET: 'short' })).toBeNull()
  })
})

describe('portal backend', () => {
  it('reports itself unconfigured and hides the sign-in routes', async () => {
    const origin = await start(null)
    expect(await (await fetch(`${origin}/api/session`)).json()).toEqual({ configured: false, user: null })
    expect((await fetch(`${origin}/auth/sso/redirect`, { redirect: 'manual' })).status).toBe(404)
  })

  it('sends the browser to ID with a PKCE challenge', async () => {
    const origin = await start(config)
    const response = await fetch(`${origin}/auth/sso/redirect`, { redirect: 'manual' })
    const url = new URL(response.headers.get('location')!)

    expect(url.origin + url.pathname).toBe('https://id.test/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('client-1')
    expect(url.searchParams.get('redirect_uri')).toBe('https://string-theory.test/auth/sso/callback')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(response.headers.getSetCookie().join()).toMatch(/st_sso=.*HttpOnly.*Secure/)
  })

  it('signs the user in, lists their apps and signs them out', async () => {
    const calls: { url: string; body: string }[] = []
    const origin = await start(config, fakeId(calls))
    const cookie = await signIn(origin)

    const session = await (await fetch(`${origin}/api/session`, { headers: { cookie } })).json()
    expect(session).toEqual({ configured: true, user: { name: 'Rob', email: 'rob@example.test' } })

    const portal = await (await fetch(`${origin}/api/portal/apps`, { headers: { cookie } })).json()
    expect(portal).toEqual({ ...apps, currentSlug: 'string-theory' })
    expect(calls.find((call) => call.url.endsWith('/api/portal/apps'))?.body).toBe(JSON.stringify({ email: 'rob@example.test' }))
    expect(calls.find((call) => call.body.includes('authorization_code'))?.body).toContain('code_verifier=')

    await fetch(`${origin}/api/portal/apps`, { headers: { cookie } })
    expect(calls.filter((call) => call.url.endsWith('/api/portal/apps'))).toHaveLength(1)

    const logout = await fetch(`${origin}/auth/logout`, { method: 'POST' })
    expect(logout.status).toBe(204)
    expect(logout.headers.getSetCookie().join()).toContain('Max-Age=0')
  })

  it('refuses the portal list without a session', async () => {
    const origin = await start(config)
    expect((await fetch(`${origin}/api/portal/apps`)).status).toBe(401)
  })

  it('refuses a callback whose state does not match', async () => {
    const origin = await start(config)
    const begin = await fetch(`${origin}/auth/sso/redirect`, { redirect: 'manual' })
    const callback = await fetch(`${origin}/auth/sso/callback?code=abc&state=wrong`, {
      redirect: 'manual',
      headers: { cookie: cookiesOf(begin) },
    })
    expect(callback.headers.get('location')).toBe('/?signin=failed')
    expect(callback.headers.getSetCookie().join()).not.toContain('st_session=ey')
  })

  it('does not follow an off-site return path', async () => {
    const origin = await start(config)
    const begin = await fetch(`${origin}/auth/sso/redirect?return=//evil.test`, { redirect: 'manual' })
    const state = new URL(begin.headers.get('location')!).searchParams.get('state')
    const callback = await fetch(`${origin}/auth/sso/callback?code=abc&state=${state}`, {
      redirect: 'manual',
      headers: { cookie: cookiesOf(begin) },
    })
    expect(callback.headers.get('location')).toBe('/')
  })

  it('rejects return paths that browsers read as another origin', async () => {
    const origin = await start(config)
    for (const bad of ['/%09/evil.test', '/%0A/evil.test', '/%5Cevil.test', '/%2F/evil.test']) {
      const begin = await fetch(`${origin}/auth/sso/redirect?return=${bad}`, { redirect: 'manual' })
      const state = new URL(begin.headers.get('location')!).searchParams.get('state')
      const callback = await fetch(`${origin}/auth/sso/callback?code=abc&state=${state}`, {
        redirect: 'manual',
        headers: { cookie: cookiesOf(begin) },
      })
      const location = callback.headers.get('location')!
      expect(location.startsWith('//')).toBe(false)
      expect(new URL(location, 'http://app.test').origin).toBe('http://app.test')
    }
  })

  it('does not accept the sign-in state cookie as a session', async () => {
    const origin = await start(config)
    const begin = await fetch(`${origin}/auth/sso/redirect`, { redirect: 'manual' })
    const replayed = cookiesOf(begin).replace('st_sso=', 'st_session=')
    const replay = await fetch(`${origin}/api/session`, { headers: { cookie: replayed } })
    expect(((await replay.json()) as { user: unknown }).user).toBeNull()

    const noEmail = sign(config.sessionSecret, 'session', { name: 'x' }, 60)
    const res = await fetch(`${origin}/api/session`, { headers: { cookie: `st_session=${noEmail}` } })
    expect(((await res.json()) as { user: unknown }).user).toBeNull()
  })

  it('redirects with a failure and clears the state when ID errors during the callback', async () => {
    const failures: (typeof fetch)[] = [
      (async () => {
        throw new Error('network')
      }) as typeof fetch,
      (async () => new Response('', { status: 500 })) as typeof fetch,
    ]
    for (const failing of failures) {
      const origin = await start(config, failing)
      const begin = await fetch(`${origin}/auth/sso/redirect`, { redirect: 'manual' })
      const state = new URL(begin.headers.get('location')!).searchParams.get('state')
      const callback = await fetch(`${origin}/auth/sso/callback?code=abc&state=${state}`, {
        redirect: 'manual',
        headers: { cookie: cookiesOf(begin) },
      })
      expect(callback.status).toBe(302)
      expect(callback.headers.get('location')).toBe('/?signin=failed')
      expect(callback.headers.getSetCookie().join()).toContain('st_sso=; ')
    }
  })

  it('shares one in-flight client-token request', async () => {
    const calls: { url: string; body: string }[] = []
    const origin = await start(config, fakeId(calls))
    const cookies = ['a', 'b'].map((n) => `st_session=${sign(config.sessionSecret, 'session', { name: n, email: `${n}@x.test` }, 60)}`)
    await Promise.all(cookies.map((cookie) => fetch(`${origin}/api/portal/apps`, { headers: { cookie } })))
    expect(calls.filter((call) => call.body.includes('client_credentials'))).toHaveLength(1)
  })

  it('answers 502 when ID is down', async () => {
    const down = (async () => new Response('', { status: 500 })) as typeof fetch
    const origin = await start(config, down)
    const cookie = `st_session=${sign(config.sessionSecret, 'session', { name: 'R', email: 'r@x.test' }, 60)}`
    expect((await fetch(`${origin}/api/portal/apps`, { headers: { cookie } })).status).toBe(502)
  })
})
