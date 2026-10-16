import { isTextFileName } from '../../../../../../app/utils/fileUtils'
import { ensureBucketExists, getTextObject } from '../../../../../utils/s3'
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

export default defineEventHandler(async (event) => {
  const key = decodeURIComponent(getRouterParam(event, 'key') || '')
  const validKey = validateBody(z.object({ key: objectKeySchema }), { key }).key
  if (!isTextFileName(validKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only text files can be read through this endpoint'
    })
  }

  const data = validateBody(publicObjectQuerySchema, getQuery(event))
  const { link, destination } = await requirePublicLink(data.hash)

  ensurePublicBucketAllowed(link, data.bucketName)
  ensurePublicKeyAllowed(link, validKey)
  await ensureBucketExists(destination, data.bucketName)

  return await getTextObject(destination, data.bucketName, validKey)
})
