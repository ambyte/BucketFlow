import { getUserById } from '../../utils/storage'
import { requireAuth } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const user = await getUserById(auth.userId)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
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
