import { listObjects } from '../../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed } from '../../../utils/helpers'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const query = getQuery(event)
  const id = query.id as string
  const bucketName = query.bucketName as string
  const prefix = query.prefix as string
  const delimiter = query.delimiter as string

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id parameter is required'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)
  const result = await listObjects(destination, bucketName, prefix, delimiter)
  return result
})
