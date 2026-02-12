import { renameFolder } from '../../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed, validateBody } from '../../../utils/helpers'
import { z } from 'zod'

const schema = z.object({
  oldPrefix: z.string().min(1),
  newPrefix: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const query = getQuery(event)
  const id = query.id as string
  const bucketName = query.bucketName as string

  if (!id || !bucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id and bucketName parameters are required'
    })
  }

  const body = await readBody(event)
  const { oldPrefix, newPrefix } = validateBody(schema, body)

  if (oldPrefix === newPrefix) {
    throw createError({
      statusCode: 400,
      statusMessage: 'oldPrefix and newPrefix must be different'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)
  const { copiedCount } = await renameFolder(destination, bucketName, oldPrefix, newPrefix)
  return { success: true, copiedCount }
})
