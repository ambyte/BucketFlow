import { z } from 'zod'
import { renameBucket } from '../../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed, validateBody, bucketNameSchema } from '../../../utils/helpers'
import { updateDestination } from '../../../utils/storage'

const renameBucketSchema = z.object({
  oldBucketName: z.string().min(1),
  newBucketName: bucketNameSchema
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
  const { oldBucketName, newBucketName } = validateBody(renameBucketSchema, body)

  if (oldBucketName === newBucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Old and new bucket names must be different'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, oldBucketName)

  try {
    await renameBucket(destination, oldBucketName, newBucketName)

    if (destination.bucketNames?.length) {
      const newBucketNames = destination.bucketNames.map(
        name => name === oldBucketName ? newBucketName : name
      )
      await updateDestination(destination.id, { bucketNames: newBucketNames })
    }

    return { success: true, message: 'Bucket renamed successfully', newBucketName }
  }
  catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to rename bucket'
    })
  }
})
