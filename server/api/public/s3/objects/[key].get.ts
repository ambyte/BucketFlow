import { getPresignedDownloadUrl } from '../../../../utils/s3'
import { getDestinationBySlug } from '../../../../utils/storage'
import { ensureBucketAllowed } from '../../../../utils/helpers'

export default defineEventHandler(async (event) => {
  const key = decodeURIComponent(getRouterParam(event, 'key') || '')
  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Key required'
    })
  }

  const query = getQuery(event)
  const slug = query.slug as string
  const bucketName = query.bucketName as string
  const filename = query.filename as string | undefined

  if (!slug || !bucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'slug and bucketName parameters are required'
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

  const url = await getPresignedDownloadUrl(destination, bucketName, key, 3600, filename)
  return { url }
})
