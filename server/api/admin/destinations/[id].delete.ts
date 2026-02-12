import { deleteDestination } from '../../../utils/storage'
import { requireAuth } from '../../../utils/helpers'

export default defineEventHandler(async (event) => {
  requireAuth(event, 'admin')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Destination ID required'
    })
  }

  const success = await deleteDestination(id)
  if (!success) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Destination not found'
    })
  }

  return { success: true }
})
