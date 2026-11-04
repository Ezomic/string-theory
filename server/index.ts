import { createHash, randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { readCookie, setCookie, sign, verify } from './session.ts'

export interface ServerConfig {
  idUrl: string
  clientId: string
  clientSecret: string
  appUrl: string
  sessionSecret: string
  appSlug: string
}

interface SsoState {
  state: string
  verifier: string
  returnTo: string
}

interface SessionUser {
  name: string
  email: string
}

interface PortalPayload {
  applications?: unknown[]
  categories?: unknown[]
}

const SESSION_COOKIE = 'st_session'
const STATE_COOKIE = 'st_sso'
const SESSION_TTL = 8 * 60 * 60
const STATE_TTL = 10 * 60
const PORTAL_TTL = 5 * 60 * 1000

export function configFromEnv(env: NodeJS.ProcessEnv): ServerConfig | null {
  const config = {
    idUrl: env.THIJSSENSOFTWARE_ID_URL ?? '',
    clientId: env.THIJSSENSOFTWARE_ID_CLIENT_ID ?? '',
    clientSecret: env.THIJSSENSOFTWARE_ID_CLIENT_SECRET ?? '',
    appUrl: (env.APP_URL ?? '').replace(/\/$/, ''),
    sessionSecret: env.SESSION_SECRET ?? '',
    appSlug: env.THIJSSENSOFTWARE_ID_APP_SLUG ?? 'string-theory',
  }
  return Object.values(config).every(Boolean) ? config : null
}

function safeReturnTo(value: string | null): string {
  return value && /^\/(?![/\\])/.test(value) ? value : '/'
}

function json(res: ServerResponse, status: number, body?: unknown, headers: Record<string, string | string[]> = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  res.end(body === undefined ? undefined : JSON.stringify(body))
}

function redirect(res: ServerResponse, location: string, cookies: string[] = []): void {
  res.writeHead(302, { Location: location, 'Set-Cookie': cookies, 'Cache-Control': 'no-store' })
  res.end()
}

export function createApp(config: ServerConfig | null, fetchImpl: typeof fetch = fetch): Server {
  const secure = config?.appUrl.startsWith('https://') ?? false
  const base = config?.idUrl.replace(/\/$/, '') ?? ''
  let appToken: { value: string; expiresAt: number } | null = null
  const portalCache = new Map<string, { at: number; data: PortalPayload }>()

  async function clientToken(config: ServerConfig): Promise<string | null> {
    if (appToken && appToken.expiresAt > Date.now()) return appToken.value

    const response = await fetchImpl(`${base}/oauth/token`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    })
    if (!response.ok) return null

    const body = (await response.json()) as { access_token?: string; expires_in?: number }
    if (!body.access_token) return null
    appToken = { value: body.access_token, expiresAt: Date.now() + Math.max(60, (body.expires_in ?? 600) - 30) * 1000 }
    return appToken.value
  }

  async function portalApps(config: ServerConfig, email: string): Promise<PortalPayload | null> {
    const cached = portalCache.get(email)
    if (cached && Date.now() - cached.at < PORTAL_TTL) return cached.data

    const token = await clientToken(config)
    if (!token) return null

    const response = await fetchImpl(`${base}/api/portal/apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!response.ok) return null

    const data = (await response.json()) as PortalPayload
    portalCache.set(email, { at: Date.now(), data })
    return data
  }

  function sessionUser(config: ServerConfig, req: IncomingMessage): SessionUser | null {
    return verify<SessionUser>(config.sessionSecret, readCookie(req.headers.cookie, SESSION_COOKIE))
  }

  function startSignIn(config: ServerConfig, returnTo: string, res: ServerResponse): void {
    const state = randomBytes(16).toString('base64url')
    const verifier = randomBytes(32).toString('base64url')
    const cookie = sign(config.sessionSecret, { state, verifier, returnTo } satisfies SsoState, STATE_TTL)
    const url = new URL(`${base}/oauth/authorize`)
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${config.appUrl}/auth/sso/callback`,
      response_type: 'code',
      scope: 'openid identity',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString()
    redirect(res, url.toString(), [setCookie(STATE_COOKIE, cookie, STATE_TTL, secure)])
  }

  async function finishSignIn(config: ServerConfig, req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const saved = verify<SsoState>(config.sessionSecret, readCookie(req.headers.cookie, STATE_COOKIE))
    const clearState = setCookie(STATE_COOKIE, '', 0, secure)
    const code = url.searchParams.get('code')

    if (!saved || !code || saved.state !== url.searchParams.get('state')) {
      return redirect(res, '/?signin=failed', [clearState])
    }

    const tokenResponse = await fetchImpl(`${base}/oauth/token`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${config.appUrl}/auth/sso/callback`,
        code,
        code_verifier: saved.verifier,
      }),
    })
    const accessToken = tokenResponse.ok ? ((await tokenResponse.json()) as { access_token?: string }).access_token : undefined
    const userResponse = accessToken
      ? await fetchImpl(`${base}/api/userinfo`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } })
      : null

    if (!userResponse?.ok) return redirect(res, '/?signin=failed', [clearState])

    const info = (await userResponse.json()) as { name?: string; email?: string }
    if (!info.email) return redirect(res, '/?signin=failed', [clearState])

    const session = sign(config.sessionSecret, { name: info.name ?? info.email, email: info.email } satisfies SessionUser, SESSION_TTL)
    redirect(res, safeReturnTo(saved.returnTo), [clearState, setCookie(SESSION_COOKIE, session, SESSION_TTL, secure)])
  }

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (req.method === 'GET' && url.pathname === '/api/session') {
      const user = config ? sessionUser(config, req) : null
      return json(res, 200, { configured: config !== null, user: user && { name: user.name, email: user.email } })
    }

    if (!config) return json(res, 404, { message: 'Not found' })

    if (req.method === 'GET' && url.pathname === '/api/portal/apps') {
      const user = sessionUser(config, req)
      if (!user) return json(res, 401, { message: 'Not signed in' })
      const data = await portalApps(config, user.email)
      if (!data) return json(res, 502, { message: 'Thijssensoftware ID is unavailable' })
      return json(res, 200, { applications: data.applications ?? [], categories: data.categories ?? [], currentSlug: config.appSlug })
    }

    if (req.method === 'GET' && url.pathname === '/auth/sso/redirect') {
      return startSignIn(config, safeReturnTo(url.searchParams.get('return')), res)
    }

    if (req.method === 'GET' && url.pathname === '/auth/sso/callback') {
      return finishSignIn(config, req, res, url)
    }

    if (req.method === 'POST' && url.pathname === '/auth/logout') {
      return json(res, 204, undefined, { 'Set-Cookie': setCookie(SESSION_COOKIE, '', 0, secure) })
    }

    json(res, 404, { message: 'Not found' })
  }

  return createServer((req, res) => {
    route(req, res).catch(() => {
      if (!res.headersSent) json(res, 502, { message: 'Thijssensoftware ID is unavailable' })
      else res.end()
    })
  })
}
