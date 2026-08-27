import type { H3Event } from 'h3'

export const AUTH_COOKIE_NAME = 'bf-auth'
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24

function isHttps(event: H3Event): boolean {
  const forwarded = getHeader(event, 'x-forwarded-proto')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() === 'https'
  }
  return getRequestURL(event).protocol === 'https:'
}

export function setAuthCookie(event: H3Event, token: string): void {
  setCookie(event, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
    secure: isHttps(event)
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isHttps(event)
  })
}

export function getAuthToken(event: H3Event): string | null {
  return getCookie(event, AUTH_COOKIE_NAME) || null
}
