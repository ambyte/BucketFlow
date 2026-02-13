import { getObjectMetadata } from '../../utils/s3'
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

  const metadata: Record<string, string> = {}
  if (head.Metadata) {
    for (const [k, v] of Object.entries(head.Metadata)) {
      if (typeof v === 'string') metadata[k] = v
    }
  }

  return {
    metadata,
    contentType: head.ContentType,
    contentLength: head.ContentLength,
    lastModified: head.LastModified,
    etag: head.ETag
  }
})
