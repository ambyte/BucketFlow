import { getDestinationBySlug } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug parameter is required'
    })
  }

  const destination = await getDestinationBySlug(slug)
  if (!destination) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Destination not found'
    })
  }

  // Check if public access is allowed
  if (!destination.allowPublicAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Public access is not allowed for this destination'
    })
  }

  // Return destination without sensitive data
  return {
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    region: destination.region,
    endpoint: destination.endpoint,
    bucketNames: destination.bucketNames,
    forcePathStyle: destination.forcePathStyle,
    allowPublicAccess: destination.allowPublicAccess
  }
})
