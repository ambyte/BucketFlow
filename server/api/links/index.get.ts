import { getPublicLinksByDestination } from '../../utils/storage'
import { requireAuth, requireS3Destination } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  requireAuth(event, 'editor')
  const query = getQuery(event)
  const destinationId = query.destinationId as string

  if (!destinationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'destinationId is required'
    })
  }

  await requireS3Destination(event, destinationId)
  const links = await getPublicLinksByDestination(destinationId)

  return { links }
})
