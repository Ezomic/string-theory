import { createHmac, timingSafeEqual } from 'node:crypto'

function mac(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url')
}

export function sign(secret: string, payload: object, ttlSeconds: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + ttlSeconds * 1000 })).toString('base64url')
  return `${body}.${mac(secret, body)}`
}

export function verify<T extends object>(secret: string, token: string | undefined, now = Date.now()): T | null {
  if (!token) return null
  const [body, signature, ...rest] = token.split('.')
  if (!body || !signature || rest.length > 0) return null

  const expected = Buffer.from(mac(secret, body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { exp?: number }
    return typeof payload.exp === 'number' && payload.exp > now ? payload : null
  } catch {
    return null
  }
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return undefined
}

export function setCookie(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`
}
