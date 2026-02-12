import { z } from 'zod'
import { getDestinationById } from '../utils/storage'
import type { S3Destination } from '../../app/types'

/** Matches generateSlug output: lowercase, alphanumeric, hyphens, underscores; no leading/trailing hyphens */
export const slugSchema = z.string().min(1).regex(
  /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/,
  'Slug must contain only lowercase letters, numbers, hyphens and underscores. No leading or trailing hyphens.'
)

/** AWS S3 bucket naming rules: 3-63 chars, lowercase letters/numbers/hyphens/periods, must start and end with letter/number */
export const bucketNameSchema = z.string()
  .min(3, 'Bucket name must be at least 3 characters')
  .max(63, 'Bucket name must be at most 63 characters')
  .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, 'Bucket name must use only lowercase letters, numbers, hyphens and periods; must start and end with a letter or number')
  .refine(name => !name.includes('..'), 'Bucket name must not contain two adjacent periods')
  .refine(name => !/^\d{1,3}(\.\d{1,3}){3}$/.test(name), 'Bucket name must not be formatted as an IP address')
  .refine(name => !name.startsWith('xn--'), 'Bucket name must not start with xn--')
  .refine(name => !name.startsWith('sthree-'), 'Bucket name must not start with sthree-')
  .refine(name => !name.startsWith('amzn-s3-demo-'), 'Bucket name must not start with amzn-s3-demo-')
  .refine(name => !name.endsWith('-s3alias'), 'Bucket name must not end with -s3alias')
  .refine(name => !name.endsWith('--ol-s3'), 'Bucket name must not end with --ol-s3')
  .refine(name => !name.endsWith('.mrap'), 'Bucket name must not end with .mrap')
  .refine(name => !name.endsWith('--x-s3'), 'Bucket name must not end with --x-s3')
  .refine(name => !name.endsWith('--table-s3'), 'Bucket name must not end with --table-s3')

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
