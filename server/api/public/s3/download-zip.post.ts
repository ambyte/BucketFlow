import { z } from 'zod'
import { validateBody } from '../../../utils/helpers'
import {
  requirePublicLink,
  ensurePublicBucketAllowed,
  ensurePublicKeyAllowed,
  ensurePublicPrefixAllowed
} from '../../../utils/publicAccess'
import {
  collectZipKeys,
  buildEntryNamesMap,
  streamZipResponse
} from '../../../utils/s3ZipDownload'
import { ensureBucketExists } from '../../../utils/s3'

const publicDownloadZipQuerySchema = z.object({
  hash: z.string().min(1, 'hash parameter is required'),
  bucketName: z.string().min(1, 'bucketName parameter is required')
})

const downloadZipBodySchema = z.object({
  keys: z.array(z.string()).default([]),
  prefixes: z.array(z.string()).default([]),
  basePath: z.string().optional().default(''),
  zipFilename: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = validateBody(publicDownloadZipQuerySchema, getQuery(event))
  const body = await readBody(event)
  const parsed = validateBody(downloadZipBodySchema, body)
  const keys = parsed.keys ?? []
  const prefixes = parsed.prefixes ?? []
  const basePath = parsed.basePath ?? ''
  const zipFilename = parsed.zipFilename

  if (keys.length === 0 && prefixes.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'keys or prefixes are required'
    })
  }

  const { link, destination } = await requirePublicLink(query.hash)
  ensurePublicBucketAllowed(link, query.bucketName)

  await ensureBucketExists(destination, query.bucketName)

  for (const key of keys.filter(Boolean)) {
    ensurePublicKeyAllowed(link, key)
  }
  for (const prefix of prefixes.filter(Boolean)) {
    ensurePublicPrefixAllowed(link, prefix)
  }

  const allKeys = await collectZipKeys(
    destination,
    query.bucketName,
    keys,
    prefixes
  )
  for (const key of allKeys) {
    ensurePublicKeyAllowed(link, key)
  }

  const keyToEntry = buildEntryNamesMap(allKeys, basePath)

  const name = zipFilename?.trim() || `${query.bucketName}-download.zip`

  return streamZipResponse(
    event,
    destination,
    query.bucketName,
    keyToEntry,
    name
  )
})
