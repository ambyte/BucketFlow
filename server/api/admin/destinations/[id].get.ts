import { getDestinationById } from '../../../utils/storage'
import { requireAuth, toClientDestination } from '../../../utils/helpers'

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
    destination: toClientDestination(destination)
  }
})
