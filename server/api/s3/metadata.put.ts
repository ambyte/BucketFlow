import { copyObjectWithMetadata } from '../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed, validateBody } from '../../utils/helpers'
import { z } from 'zod'

const schema = z.object({
  metadata: z.record(z.string(), z.string())
})

export default defineEventHandler(async (event) => {
  requireAuth(event, 'editor')

  const query = getQuery(event)
  const id = query.id as string
  const bucketName = query.bucketName as string
  const key = query.key as string

  if (!id || !bucketName || !key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id, bucketName and key parameters are required'
    })
  }

  const body = await readBody(event)
  const { metadata } = validateBody(schema, body)

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)

  await copyObjectWithMetadata(destination, bucketName, key, metadata)
  return { success: true }
})
