import { getPresignedUploadUrl, objectExists, ensureBucketExists } from '../../../utils/s3'
import {
  requirePublicLink,
  ensurePublicBucketAllowed,
  ensurePublicKeyAllowed
} from '../../../utils/publicAccess'
import { folderKeySchema, objectKeySchema, validateBody } from '../../../utils/helpers'
import { z } from 'zod'

const bodySchema = z.object({
  key: z.string().min(1),
  contentType: z.string().min(1),
  allowOverwrite: z.boolean().optional().default(false)
})

const querySchema = z.object({
  hash: z.string().min(1),
  bucketName: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const body = await readBody(event)

  const queryData = querySchema.parse(query)
  const parsedBody = validateBody(bodySchema, body)
  const { contentType, allowOverwrite } = parsedBody
  const isFolder = contentType === 'application/x-directory'

  const key = isFolder
    ? validateBody(z.object({ key: folderKeySchema }), { key: parsedBody.key }).key
    : validateBody(z.object({ key: objectKeySchema }), { key: parsedBody.key }).key

  const { link, destination } = await requirePublicLink(queryData.hash)

  ensurePublicBucketAllowed(link, queryData.bucketName)
  ensurePublicKeyAllowed(link, key)

  await ensureBucketExists(destination, queryData.bucketName)

  if (isFolder) {
    if (!link.allowFolderCreation) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Folder creation is not allowed for this link'
      })
    }
  } else if (!link.allowFileUpload) {
    throw createError({
      statusCode: 403,
      statusMessage: 'File upload is not allowed for this link'
    })
  }

  if (!allowOverwrite && (await objectExists(destination, queryData.bucketName, key))) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Object already exists. Pass allowOverwrite to replace it.'
    })
  }

  const url = await getPresignedUploadUrl(
    destination,
    queryData.bucketName,
    key,
    contentType
  )
  return { url, key }
})
