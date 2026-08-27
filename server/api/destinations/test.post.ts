import type { S3Destination } from '~/types'
import { testS3Connection } from '../../utils/s3'
import { getDestinationById } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  requireAuth(event, 'admin')

  const body = await readBody(event)

  if (body.id && (!body.secretAccessKey || !body.accessKeyId || !body.endpoint)) {
    const stored = await getDestinationById(body.id)
    if (!stored) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Destination not found'
      })
    }
    const destination = {
      region: body.region || stored.region,
      endpoint: body.endpoint || stored.endpoint,
      accessKeyId: body.accessKeyId || stored.accessKeyId,
      secretAccessKey: body.secretAccessKey || stored.secretAccessKey,
      forcePathStyle: body.forcePathStyle ?? stored.forcePathStyle ?? true
    } as S3Destination
    return await testS3Connection(destination)
  }

  if (body.endpoint && body.accessKeyId && body.secretAccessKey) {
    const destination = {
      region: body.region,
      endpoint: body.endpoint,
      accessKeyId: body.accessKeyId,
      secretAccessKey: body.secretAccessKey,
      forcePathStyle: body.forcePathStyle ?? true
    } as S3Destination
    return await testS3Connection(destination)
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'S3 configuration is required'
  })
})
