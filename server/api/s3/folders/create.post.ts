import { createFolder } from '../../../utils/s3'
import {
  requireAuth,
  requireS3Destination,
  ensureBucketAllowed,
  validateBody,
  folderKeySchema
} from '../../../utils/helpers'
import { z } from 'zod'

const schema = z.object({
  key: folderKeySchema
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
  const { key } = validateBody(schema, body)

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)
  await createFolder(destination, bucketName, key)
  return { success: true }
})
