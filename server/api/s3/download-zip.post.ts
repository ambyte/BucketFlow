import { z } from 'zod'
import {
  requireAuth,
  requireS3Destination,
  ensureBucketAllowed,
  validateBody
} from '../../utils/helpers'
import {
  collectZipKeys,
  buildEntryNamesMap,
  streamZipResponse
} from '../../utils/s3ZipDownload'

const downloadZipBodySchema = z.object({
  keys: z.array(z.string()).default([]),
  prefixes: z.array(z.string()).default([]),
  basePath: z.string().optional().default(''),
  zipFilename: z.string().optional()
})

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const query = getQuery(event)
  const id = query.id as string
  const bucketName = query.bucketName as string

  if (!id || !bucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id and bucketName parameters are required'
    })
  }

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

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)

  const allKeys = await collectZipKeys(destination, bucketName, keys, prefixes)
  const keyToEntry = buildEntryNamesMap(allKeys, basePath)

  const name = zipFilename?.trim() || `${bucketName}-download.zip`

  return streamZipResponse(event, destination, bucketName, keyToEntry, name)
})
