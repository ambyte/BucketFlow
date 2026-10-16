import { isTextFileName } from '../../../../../app/utils/fileUtils'
import { getTextObject } from '../../../../utils/s3'
import {
  ensureBucketAllowed,
  objectKeySchema,
  requireAuth,
  requireS3Destination,
  validateBody
} from '../../../../utils/helpers'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const key = decodeURIComponent(getRouterParam(event, 'key') || '')
  const validKey = validateBody(z.object({ key: objectKeySchema }), { key }).key
  if (!isTextFileName(validKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only text files can be read through this endpoint'
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

  return await getTextObject(destination, bucketName, validKey)
})
