import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function rateLimit(
  event: H3Event,
  options: { name: string, max: number, windowMs: number }
): void {
  const now = Date.now()
  if (buckets.size > 2000) prune(now)

  const ip = getRequestIP(event, { xForwardedFor: false }) || 'unknown'
  const key = `${options.name}:${ip}`
  let bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + options.windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  if (bucket.count > options.max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    setHeader(event, 'Retry-After', retryAfter)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many attempts. Please try again later.'
    })
  }
}
