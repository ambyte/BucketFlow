import { z } from 'zod'
import { getDestinationById } from '../utils/storage'
import type { S3Destination } from '../../app/types'

/** AWS S3 bucket naming rules: 3-63 chars, lowercase letters/numbers/hyphens/periods, must start and end with letter/number */
export const bucketNameSchema = z
  .string()
  .min(3, 'Bucket name must be at least 3 characters')
  .max(63, 'Bucket name must be at most 63 characters')
  .regex(
    /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
    'Bucket name must use only lowercase letters, numbers, hyphens and periods; must start and end with a letter or number'
  )
  .refine(
    name => !name.includes('..'),
    'Bucket name must not contain two adjacent periods'
  )
  .refine(
    name => !/^\d{1,3}(\.\d{1,3}){3}$/.test(name),
    'Bucket name must not be formatted as an IP address'
  )
  .refine(
    name => !name.startsWith('xn--'),
    'Bucket name must not start with xn--'
  )
  .refine(
    name => !name.startsWith('sthree-'),
    'Bucket name must not start with sthree-'
  )
  .refine(
    name => !name.startsWith('amzn-s3-demo-'),
    'Bucket name must not start with amzn-s3-demo-'
  )
  .refine(
    name => !name.endsWith('-s3alias'),
    'Bucket name must not end with -s3alias'
  )
  .refine(
    name => !name.endsWith('--ol-s3'),
    'Bucket name must not end with --ol-s3'
  )
  .refine(
    name => !name.endsWith('.mrap'),
    'Bucket name must not end with .mrap'
  )
  .refine(
    name => !name.endsWith('--x-s3'),
    'Bucket name must not end with --x-s3'
  )
  .refine(
    name => !name.endsWith('--table-s3'),
    'Bucket name must not end with --table-s3'
  )

/** Single path segment for an S3 folder (no slashes, not `.` / `..`). */
export const folderNameSchema = z
  .string()
  .trim()
  .min(1, 'Folder name is required')
  .max(255, 'Folder name is too long')
  .refine(
    name => !/[\\/]/.test(name),
    'Folder name must not contain slashes'
  )
  .refine(
    name => name !== '.' && name !== '..',
    'Invalid folder name'
  )

/** Full S3 folder key (prefix), e.g. `photos/2024/`. */
export const folderKeySchema = z
  .string()
  .min(1, 'Folder key is required')
  .transform(key => key.replace(/^\/+/, '').replace(/\/+$/, '') + '/')
  .refine((key) => {
    const segments = key.slice(0, -1).split('/')
    return (
      segments.length > 0
      && segments.every(segment => folderNameSchema.safeParse(segment).success)
    )
  }, 'Invalid folder path')

/** S3 object key (file), e.g. `photos/2024/file.pdf`. */
export const objectKeySchema = z
  .string()
  .min(1, 'Object key is required')
  .max(1024, 'Object key is too long')
  .transform(key => key.replace(/^\/+/, '').replace(/\/+$/, ''))
  .refine((key) => {
    const segments = key.split('/')
    return (
      segments.length > 0
      && segments.every(segment => folderNameSchema.safeParse(segment).success)
    )
  }, 'Invalid object key')

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

export function canAccessDestination(
  destination: S3Destination,
  auth: { role: string, userId: string }
): boolean {
  if (auth.role === 'admin') return true
  const allowed = destination.allowedUserIds || []
  return allowed.includes(auth.userId)
}

export function ensureDestinationAccess(
  destination: S3Destination,
  auth: { role: string, userId: string }
): void {
  if (!canAccessDestination(destination, auth)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied to this destination'
    })
  }
}

export async function requireS3Destination(
  event: any,
  id: string
): Promise<S3Destination> {
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

  ensureDestinationAccess(destination, auth)

  return destination
}

/** Check if user can create public links for this destination */
export function canCreatePublicLink(
  destination: S3Destination,
  auth: { role: string, userId: string }
): boolean {
  if (!destination.allowPublicAccess) return false
  if (auth.role !== 'admin' && auth.role !== 'editor') return false
  return canAccessDestination(destination, auth)
}

export function ensureBucketAllowed(
  destination: S3Destination,
  bucketName: string
): void {
  const allowed = destination.bucketNames
  if (allowed && allowed.length > 0 && !allowed.includes(bucketName)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access to this bucket is not allowed'
    })
  }
}

export function toClientDestination(destination: S3Destination) {
  return {
    id: destination.id,
    name: destination.name,
    region: destination.region,
    endpoint: destination.endpoint,
    accessKeyId: destination.accessKeyId,
    hasSecretAccessKey: Boolean(destination.secretAccessKey),
    bucketNames: destination.bucketNames,
    forcePathStyle: destination.forcePathStyle,
    allowPublicAccess: destination.allowPublicAccess,
    allowedUserIds: destination.allowedUserIds,
    metadataColumns: destination.metadataColumns ?? [],
    createdAt: destination.createdAt,
    updatedAt: destination.updatedAt
  }
}

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Validation error: ' + error.errors.map(e => e.message).join(', ')
      })
    }
    throw error
  }
}
