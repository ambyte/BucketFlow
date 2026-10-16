import { isTextFileName } from '../../../../../../app/utils/fileUtils'
import { ensureBucketExists, saveTextObject } from '../../../../../utils/s3'
import {
  ensurePublicBucketAllowed,
  ensurePublicKeyAllowed,
  publicObjectQuerySchema,
  requirePublicLink
} from '../../../../../utils/publicAccess'
import {
  objectKeySchema,
  validateBody
} from '../../../../../utils/helpers'
import { z } from 'zod'

const bodySchema = z.object({
  content: z.string(),
  contentType: z.string().min(1).max(255).optional()
})

export default defineEventHandler(async (event) => {
  const key = decodeURIComponent(getRouterParam(event, 'key') || '')
  const validKey = validateBody(z.object({ key: objectKeySchema }), { key }).key
  if (!isTextFileName(validKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only text files can be edited'
    })
  }

  const data = validateBody(publicObjectQuerySchema, getQuery(event))
  const { link, destination } = await requirePublicLink(data.hash)
  if (!link.allowTextFileEdit) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Text file editing is not allowed for this link'
    })
  }

  ensurePublicBucketAllowed(link, data.bucketName)
  ensurePublicKeyAllowed(link, validKey)
  await ensureBucketExists(destination, data.bucketName)

  const body = validateBody(bodySchema, await readBody(event))
  await saveTextObject(
    destination,
    data.bucketName,
    validKey,
    body.content,
    body.contentType || 'text/plain; charset=utf-8'
  )
  return { success: true }
})
