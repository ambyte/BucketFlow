import { verifyToken } from '../utils/auth'
import { getJwtSecret } from '../utils/runtime-secrets'
import { getUserById } from '../utils/storage'
import { getAuthToken, clearAuthCookie } from '../utils/auth-cookie'

export default defineEventHandler(async (event) => {
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/setup-status',
    '/api/auth/logout',
    '/api/health',
    '/api/public',
    '/_nuxt',
    '/__nuxt',
    '/api/_nuxt_icon',
    '/favicon.ico'
  ]

  if (publicPaths.some(path => event.path?.startsWith(path))) {
    return
  }

  if (!event.path?.startsWith('/api/')) {
    return
  }

  const token = getAuthToken(event)

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const payload = verifyToken(token, getJwtSecret())

  if (!payload) {
    clearAuthCookie(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }

  const user = await getUserById(payload.userId)
  if (!user) {
    clearAuthCookie(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  event.context.auth = {
    userId: user.id,
    username: user.username,
    role: user.role
  }
})
