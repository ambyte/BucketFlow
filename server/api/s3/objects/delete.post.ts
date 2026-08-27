import { z } from 'zod'
import { deleteObjectsAndFolders } from '../../../utils/s3'
import {
  requireAuth,
  requireS3Destination,
  ensureBucketAllowed,
  validateBody,
  folderKeySchema
} from '../../../utils/helpers'

const schema = z.object({
  keys: z.array(z.string().min(1)).default([]),
  prefixes: z.array(folderKeySchema).default([])
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
  const parsed = validateBody(schema, body)
  const keys = parsed.keys ?? []
  const prefixes = parsed.prefixes ?? []

  if (keys.length === 0 && prefixes.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'keys or prefixes are required'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)
  const { deletedCount } = await deleteObjectsAndFolders(
    destination,
    bucketName,
    keys,
    prefixes
  )
  return { success: true, deletedCount }
})
