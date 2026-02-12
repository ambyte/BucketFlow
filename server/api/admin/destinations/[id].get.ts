import { getDestinationById } from '../../../utils/storage'
import { requireAuth } from '../../../utils/helpers'
import type { S3Destination } from '../../../../app/types'

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

  const destination = await getDestinationById(id)
  if (!destination) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Destination not found'
    })
  }

  return {
    destination: destinationToResponse(destination)
  }
})
