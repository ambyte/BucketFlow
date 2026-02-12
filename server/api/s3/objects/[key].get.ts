import { getPresignedDownloadUrl } from '../../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed } from '../../../utils/helpers'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const key = decodeURIComponent(getRouterParam(event, 'key') || '')
  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Key required'
    })
  }

  const query = getQuery(event)
  const id = query.id as string
  const bucketName = query.bucketName as string
  const filename = query.filename as string | undefined

  if (!id || !bucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id and bucketName parameters are required'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)
  const url = await getPresignedDownloadUrl(destination, bucketName, key, 3600, filename)
  return { url }
})
