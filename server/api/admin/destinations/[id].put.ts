import { z } from 'zod'
import { updateDestination } from '../../../utils/storage'
import { requireAuth, validateBody, slugSchema } from '../../../utils/helpers'
import type { S3Destination } from '../../../../app/types'

const updateDestinationSchema = z.object({
  name: z.string().min(1).optional(),
  slug: slugSchema.optional(),
  region: z.string().optional(),
  endpoint: z.string().min(1).optional(),
  accessKeyId: z.string().min(1).optional(),
  secretAccessKey: z.string().min(1).optional(),
  bucketNames: z.array(z.string().min(1)).optional(),
  forcePathStyle: z.boolean().optional(),
  allowPublicAccess: z.boolean().optional(),
  allowedUserIds: z.array(z.string()).optional(),
  metadataColumns: z.array(z.string().min(1)).optional()
})

function destinationToResponse(destination: S3Destination) {
  return {
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    region: destination.region,
    endpoint: destination.endpoint,
    accessKeyId: destination.accessKeyId,
    secretAccessKey: destination.secretAccessKey,
    bucketNames: destination.bucketNames,
    forcePathStyle: destination.forcePathStyle,
    allowPublicAccess: destination.allowPublicAccess,
    allowedUserIds: destination.allowedUserIds,
    metadataColumns: destination.metadataColumns ?? [],
    createdAt: destination.createdAt,
    updatedAt: destination.updatedAt
  }
}

export default defineEventHandler(async (event) => {
  requireAuth(event, 'admin')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Destination ID required'
    })
  }

  const body = await readBody(event)
  const data = validateBody(updateDestinationSchema, body)

  try {
    const destination = await updateDestination(id, data)
    if (!destination) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Destination not found'
      })
    }

    return {
      destination: destinationToResponse(destination)
    }
  }
  catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to update destination'
    })
  }
})
