import { getUsers } from '../../utils/storage'
import { requireAuth } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const users = await getUsers()
  const user = users.find(u => u.id === auth.userId)
  
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    }
  }
})
