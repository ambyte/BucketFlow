import { z } from 'zod'
import { getDestinations, createDestination } from '../../../utils/storage'
import { requireAuth, validateBody } from '../../../utils/helpers'
import type { S3Destination } from '../../../../app/types'

const createDestinationSchema = z.object({
  name: z.string().min(1),
  region: z.string().optional(),
  endpoint: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  bucketNames: z.array(z.string().min(1)).default([]),
  forcePathStyle: z.boolean().optional(),
  allowPublicAccess: z.boolean().optional(),
  allowedUserIds: z.array(z.string()).default([]),
  metadataColumns: z.array(z.string().min(1)).optional()
})

export default defineEventHandler(async (event) => {
  const method = event.method
  requireAuth(event, 'admin')
  if (method === 'GET') {
    const destinations = await getDestinations()
    return {
      destinations: destinations as S3Destination[]
    }
  }
  if (method === 'POST') {
    const body = await readBody(event)
    const data = validateBody(createDestinationSchema, body)

    try {
      const destination = await createDestination(data as Omit<S3Destination, 'id' | 'createdAt' | 'updatedAt'>)

      return { destination: destination as S3Destination }
    } catch (error: any) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message || 'Failed to create destination'
      })
    }
  }
})
