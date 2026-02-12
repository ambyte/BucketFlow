import { z } from 'zod'
import { getDestinations, createDestination } from '../../../utils/storage'
import { requireAuth, validateBody, slugSchema } from '../../../utils/helpers'
import type { S3Destination } from '../../../../app/types'

const createDestinationSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  region: z.string().optional(),
  endpoint: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  bucketNames: z.array(z.string().min(1)).default([]),
  forcePathStyle: z.boolean().optional(),
  allowPublicAccess: z.boolean().optional(),
  allowedUserIds: z.array(z.string()).default([])
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
    const destinations = await getDestinations()
    if (destinations.some(d => d.slug === data.slug)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Destination with this slug already exists'
      })
    }

    try {
      const destination = await createDestination(data as Omit<S3Destination, 'id' | 'createdAt' | 'updatedAt'>)

      return { destination: destination as S3Destination }
    }
    catch (error: any) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message || 'Failed to create destination'
      })
    }
  }
})
