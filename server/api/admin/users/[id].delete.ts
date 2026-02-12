import { getUsers, deleteUser } from '../../../utils/storage'
import { requireAuth } from '../../../utils/helpers'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event, 'admin')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID required'
    })
  }

  // Prevent self-deletion
  if (id === auth.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot delete your own account'
    })
  }

  const users = await getUsers()
  const targetUser = users.find(u => u.id === id)
  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Prevent deleting the last admin
  if (targetUser.role === 'admin') {
    const adminCount = users.filter(u => u.role === 'admin').length
    if (adminCount <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete the last administrator'
      })
    }
  }

  const success = await deleteUser(id)
  if (!success) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return { success: true }
})
