import { z } from 'zod'
import { createBucket, getS3ErrorMessage, getS3HttpStatus } from '../../../utils/s3'
import { requireAuth, requireS3Destination, validateBody, bucketNameSchema } from '../../../utils/helpers'
import { updateDestination } from '../../../utils/storage'

const createBucketSchema = z.object({
  bucketName: bucketNameSchema
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

    if (destination.bucketNames?.length
      && !destination.bucketNames.includes(data.bucketName)) {
      await updateDestination(destination.id, {
        bucketNames: [...destination.bucketNames, data.bucketName]
      })
    }

    return { success: true, message: 'Bucket created successfully' }
  } catch (error: unknown) {
    throw createError({
      statusCode: getS3HttpStatus(error),
      statusMessage: getS3ErrorMessage(error) || 'Failed to create bucket'
    })
  }
})
