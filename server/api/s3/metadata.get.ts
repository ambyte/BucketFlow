import { getObjectMetadata, decodeMetadataFromS3 } from '../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  requireAuth(event, 'editor')

  const query = getQuery(event)
  const id = query.id as string
  const bucketName = query.bucketName as string
  const key = query.key as string

  if (!id || !bucketName || !key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id, bucketName and key parameters are required'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)

  const head = await getObjectMetadata(destination, bucketName, key)
  const metadata = decodeMetadataFromS3(head.Metadata as Record<string, string>)

  return {
    metadata,
    contentType: head.ContentType,
    contentLength: head.ContentLength,
    lastModified: head.LastModified,
    etag: head.ETag
  }
})
