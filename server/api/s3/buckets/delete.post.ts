import { z } from 'zod'
import { deleteBucket, getS3ErrorMessage, getS3HttpStatus } from '../../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed, validateBody } from '../../../utils/helpers'
import { updateDestination, deletePublicLinksForBucket } from '../../../utils/storage'

const deleteBucketSchema = z.object({
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
  const { bucketName } = validateBody(deleteBucketSchema, body)

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)

  try {
    await deleteBucket(destination, bucketName)

    if (destination.bucketNames?.length) {
      await updateDestination(destination.id, {
        bucketNames: destination.bucketNames.filter(name => name !== bucketName)
      })
    }

    await deletePublicLinksForBucket(destination.id, bucketName)

    return { success: true, message: 'Bucket deleted successfully' }
  } catch (error: unknown) {
    throw createError({
      statusCode: getS3HttpStatus(error),
      statusMessage: getS3ErrorMessage(error) || 'Failed to delete bucket'
    })
  }
})
