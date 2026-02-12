import { deleteObject } from '../../../utils/s3'
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

  if (!id || !bucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id and bucketName parameters are required'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)
  await deleteObject(destination, bucketName, key)
  return { success: true }
})
