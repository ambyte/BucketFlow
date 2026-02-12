import { z } from 'zod'
import { getDestinationById } from '../utils/storage'
import type { S3Destination } from '../../app/types'

/** Matches generateSlug output: lowercase, alphanumeric, hyphens, underscores; no leading/trailing hyphens */
export const slugSchema = z.string().min(1).regex(
  /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/,
  'Slug must contain only lowercase letters, numbers, hyphens and underscores. No leading or trailing hyphens.'
)

export function requireAuth(event: any, requiredRole?: string) {
  const auth = event.context.auth

  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  if (requiredRole && auth.role !== requiredRole && auth.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return auth
}

export async function requireS3Destination(event: any, id: string): Promise<S3Destination> {
  const auth = event.context?.auth
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const destination = await getDestinationById(id)

  if (!destination) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Destination not found'
    })
  }

  // Admin can access any destination; others need to be in allowedUserIds
  if (auth.role !== 'admin') {
    const allowed = destination.allowedUserIds || []
    if (!allowed.includes(auth.userId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied to this destination'
      })
    }
  }

  return destination
}

export function ensureBucketAllowed(destination: S3Destination, bucketName: string): void {
  const allowed = destination.bucketNames
  if (allowed && allowed.length > 0 && !allowed.includes(bucketName)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access to this bucket is not allowed'
    })
  }
}

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error: ' + error.errors.map(e => e.message).join(', ')
      })
    }
    throw error
  }
}
