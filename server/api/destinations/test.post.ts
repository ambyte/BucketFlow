
import { S3Destination } from '~/types'
import { testS3Connection } from '../../utils/s3'

export default defineEventHandler(async (event) => {
  requireAuth(event, 'admin')

  const body = await readBody(event)
  if (body.endpoint && body.accessKeyId && body.secretAccessKey) {
    const destination = {
      region: body.region,
      endpoint: body.endpoint,
      accessKeyId: body.accessKeyId,
      secretAccessKey: body.secretAccessKey,
      forcePathStyle: body.forcePathStyle ?? true
    } as S3Destination
    const result = await testS3Connection(destination)
    return result
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'S3 configuration is required'
  })
})
