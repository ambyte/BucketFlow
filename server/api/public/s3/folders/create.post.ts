import { createFolder, ensureBucketExists } from '../../../../utils/s3'
import {
  requirePublicLink,
  ensurePublicBucketAllowed,
  ensurePublicKeyAllowed
} from '../../../../utils/publicAccess'
import { folderKeySchema, validateBody } from '../../../../utils/helpers'
import { z } from 'zod'

const bodySchema = z.object({
  key: folderKeySchema
})

const querySchema = z.object({
  hash: z.string().min(1),
  bucketName: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const body = await readBody(event)

  const queryData = querySchema.parse(query)
  const { key } = validateBody(bodySchema, body)

  const { link, destination } = await requirePublicLink(queryData.hash)

  if (!link.allowFolderCreation) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Folder creation is not allowed for this link'
    })
  }

  ensurePublicBucketAllowed(link, queryData.bucketName)
  ensurePublicKeyAllowed(link, key)

  await ensureBucketExists(destination, queryData.bucketName)
  await createFolder(destination, queryData.bucketName, key)
  return { success: true }
})
