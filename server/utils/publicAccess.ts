import { z } from 'zod'
import type { S3Destination, PublicLink } from '../../app/types'
import { getPublicLinkByHash, getDestinationById } from './storage'
import { ensureBucketExists, hasPrefixContent } from './s3'

export interface PublicAccessContext {
  link: PublicLink
  destination: S3Destination
}

export async function requirePublicLink(
  hash: string
): Promise<PublicAccessContext> {
  if (!hash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Link hash is required'
    })
  }

  const link = await getPublicLinkByHash(hash)
  if (!link) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Public link not found'
    })
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: 'This public link has expired'
    })
  }

  const destination = await getDestinationById(link.destinationId)
  if (!destination || !destination.allowPublicAccess) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Public link not found'
    })
  }

  return { link, destination }
}

export function ensurePublicBucketAllowed(
  link: PublicLink,
  bucketName: string
): void {
  if (link.bucketName !== bucketName) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access to this bucket is not allowed'
    })
  }
}

export function ensurePublicPrefixAllowed(
  link: PublicLink,
  prefix: string
): void {
  const linkPath = link.path || ''
  if (!linkPath) return
  const normalizedLinkPath = linkPath.endsWith('/') ? linkPath : linkPath + '/'
  const normalizedPrefix = prefix || ''
  if (normalizedPrefix === '') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access to this path is not allowed'
    })
  }
  if (
    !normalizedPrefix.startsWith(normalizedLinkPath)
    && normalizedPrefix !== linkPath
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access to this path is not allowed'
    })
  }
}

export function ensurePublicKeyAllowed(link: PublicLink, key: string): void {
  const linkPath = link.path || ''
  if (!linkPath) return
  const normalizedLinkPath = linkPath.endsWith('/') ? linkPath : linkPath + '/'
  if (!key.startsWith(normalizedLinkPath) && key !== linkPath) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access to this file is not allowed'
    })
  }
}

function normalizedPathPrefix(path: string): string {
  const p = path.trim()
  if (!p) return ''
  return p.endsWith('/') ? p : `${p}/`
}

export function isPublicLinkListRootPrefix(
  link: PublicLink,
  prefix: string
): boolean {
  const p = (prefix ?? '').trim()
  const linkRoot = normalizedPathPrefix(link.path ?? '')
  if (!linkRoot) {
    return p === ''
  }
  return normalizedPathPrefix(p) === linkRoot
}

/** Ensure bucket and prefix exist in S3 */
export async function ensurePublicListS3Exists(
  destination: S3Destination,
  link: PublicLink,
  bucketName: string,
  prefix: string
): Promise<void> {
  await ensureBucketExists(destination, bucketName)
  const p = prefix ?? ''
  if (isPublicLinkListRootPrefix(link, p)) return
  const exists = await hasPrefixContent(destination, bucketName, p)
  if (!exists) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Folder not found'
    })
  }
}

/** Ensure link target exists in S3 */
export async function ensurePublicLinkTargetExistsInS3(
  destination: S3Destination,
  link: PublicLink
): Promise<void> {
  await ensureBucketExists(destination, link.bucketName)
  const scopedPath = (link.path ?? '').trim()
  if (!scopedPath) return
  const exists = await hasPrefixContent(destination, link.bucketName, scopedPath)
  if (!exists) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Folder not found'
    })
  }
}

export const publicHashQuerySchema = z.object({
  hash: z.string().min(1, 'hash parameter is required')
})

export const publicListQuerySchema = z.object({
  hash: z.string().min(1, 'hash parameter is required'),
  bucketName: z.string().min(1, 'bucketName parameter is required'),
  prefix: z.string().default('')
})

export const publicObjectQuerySchema = z.object({
  hash: z.string().min(1, 'hash parameter is required'),
  bucketName: z.string().min(1, 'bucketName parameter is required'),
  filename: z.string().optional()
})
