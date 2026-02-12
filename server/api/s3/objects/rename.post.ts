import { renameFile } from '../../../utils/s3'
import { requireAuth, requireS3Destination, ensureBucketAllowed, validateBody } from '../../../utils/helpers'
import { z } from 'zod'

const schema = z.object({
  oldKey: z.string().min(1),
  newKey: z.string().min(1)
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
  const { oldKey, newKey } = validateBody(schema, body)

  if (oldKey === newKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'oldKey and newKey must be different'
    })
  }

  const destination = await requireS3Destination(event, id)
  ensureBucketAllowed(destination, bucketName)
  await renameFile(destination, bucketName, oldKey, newKey)
  return { success: true }
})
