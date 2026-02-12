import { getPresignedUploadUrl } from '../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const body = await readBody(event)
  const { key, contentType } = body

  if (!key || !contentType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Key and contentType required'
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
  const url = await getPresignedUploadUrl(destination, bucketName, key, contentType)
  return { url }
})
