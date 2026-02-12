import { listBuckets } from '../../../utils/s3'
import { getDestinationBySlug } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = query.slug as string

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

  // If destination has bucketNames specified, filter to only those; otherwise return all buckets
  const bucketFilter = destination.bucketNames?.length ? destination.bucketNames : undefined
  const buckets = await listBuckets(destination, bucketFilter)
  return { buckets }
})
