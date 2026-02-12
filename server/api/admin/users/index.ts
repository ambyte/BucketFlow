import { z } from 'zod'
import { getUsers, createUser } from '../../../utils/storage'
import { hashPassword } from '../../../utils/auth'
import { requireAuth, validateBody } from '../../../utils/helpers'
import type { UserRole } from '../../../../app/types'

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['admin', 'editor'])
})

export default defineEventHandler(async (event) => {
  const method = event.method

  requireAuth(event, 'admin')

  if (method === 'GET') {
    const users = await getUsers()
    return {
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }))
    }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const data = validateBody(createUserSchema, body)

    const users = await getUsers()
    if (users.some(u => u.username === data.username)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username already exists'
      })
    }

    const hashedPassword = await hashPassword(data.password)
    const user = await createUser({
      username: data.username,
      password: hashedPassword,
      role: data.role as UserRole
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
