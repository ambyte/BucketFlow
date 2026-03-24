import { getPublicLinkById, deletePublicLink } from '../../utils/storage'
import { requireAuth, requireS3Destination } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  requireAuth(event, 'editor')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Link ID required'
    })
  }

  const link = await getPublicLinkById(id)
  if (!link) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Public link not found'
    })
  }

  await requireS3Destination(event, link.destinationId)

  const deleted = await deletePublicLink(id)
  if (!deleted) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete link'
    })
  }

  return { success: true }
})
