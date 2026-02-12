import { verifyToken } from '../utils/auth'
import { getJwtSecret } from '../utils/runtime-secrets'

export default defineEventHandler(async (event) => {
  // Skip auth for non-API routes and public API endpoints
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/setup-status',
    '/api/health',
    '/api/public',
    '/_nuxt',
    '/__nuxt',
    '/api/_nuxt_icon',
    '/favicon.ico'
  ]
  
  // Skip if path is public
  if (publicPaths.some(path => event.path?.startsWith(path))) {
    return
  }
  
  // Only require auth for API routes
  if (!event.path?.startsWith('/api/')) {
    return
  }

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const payload = verifyToken(token, getJwtSecret())
  
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }

  event.context.auth = payload
})
