import { z } from 'zod'
import { getUsers, updateUser } from '../../../utils/storage'
import { hashPassword } from '../../../utils/auth'
import { requireAuth, validateBody } from '../../../utils/helpers'
import type { UserRole } from '../../../../app/types'

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'editor']).optional()
})

export default defineEventHandler(async (event) => {
  requireAuth(event, 'admin')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID required'
    })
  }

  const body = await readBody(event)
  const data = validateBody(updateUserSchema, body)

  if (data.username) {
    const users = await getUsers()
    const exists = users.some(u => u.username === data.username && u.id !== id)
    if (exists) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username already exists'
      })
    }
  }

  const updates: Partial<{ username: string; password: string; role: UserRole }> = {}
  if (data.username) updates.username = data.username
  if (data.password) updates.password = await hashPassword(data.password)
  if (data.role) updates.role = data.role as UserRole

  const user = await updateUser(id, updates)
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
      updatedAt: user.updatedAt
    }
  }
})
