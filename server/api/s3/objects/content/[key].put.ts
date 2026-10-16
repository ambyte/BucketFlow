import { isTextFileName } from '../../../../../app/utils/fileUtils'
import { saveTextObject } from '../../../../utils/s3'
import {
  ensureBucketAllowed,
  objectKeySchema,
  requireAuth,
  requireS3Destination,
  validateBody
} from '../../../../utils/helpers'
import { z } from 'zod'

const bodySchema = z.object({
  content: z.string(),
  contentType: z.string().min(1).max(255).optional()
})

export default defineEventHandler(async (event) => {
  requireAuth(event, 'editor')

  const key = decodeURIComponent(getRouterParam(event, 'key') || '')
  const validKey = validateBody(z.object({ key: objectKeySchema }), { key }).key
  if (!isTextFileName(validKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only text files can be edited'
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
  const body = validateBody(bodySchema, await readBody(event))

  await saveTextObject(
    destination,
    bucketName,
    validKey,
    body.content,
    body.contentType || 'text/plain; charset=utf-8'
  )
  return { success: true }
})
