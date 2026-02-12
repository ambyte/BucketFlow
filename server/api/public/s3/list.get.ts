import { listObjects } from '../../../utils/s3'
import { getDestinationBySlug } from '../../../utils/storage'
import { ensureBucketAllowed } from '../../../utils/helpers'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = query.slug as string
  const bucketName = query.bucketName as string
  const prefix = query.prefix as string
  const delimiter = query.delimiter as string

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'slug parameter is required'
    })
  }

  const destination = await getDestinationBySlug(slug)
  if (!destination) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Destination not found'
    })
  }

  // Check if public access is allowed
  if (!destination.allowPublicAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Public access is not allowed for this destination'
    })
  }

  ensureBucketAllowed(destination, bucketName)

  const result = await listObjects(destination, bucketName, prefix, delimiter)
  return result
})
