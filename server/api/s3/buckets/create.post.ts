import { createBucket } from '../../../utils/s3'
import { requireAuth, requireS3Destination } from '../../../utils/helpers'
import { z } from 'zod'

const createBucketSchema = z.object({
  bucketName: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  requireAuth(event, 'admin')

  const query = getQuery(event)
  const id = query.id as string

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id parameter is required'
    })
  }

  const body = await readBody(event)
  const data = validateBody(createBucketSchema, body)

  const destination = await requireS3Destination(event, id)

  try {
    await createBucket(destination, data.bucketName)
    return { success: true, message: 'Bucket created successfully' }
  }
  catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to create bucket'
    })
  }
})
