import { z } from 'zod'
import { getUserByUsername } from '../../utils/storage'
import { verifyPassword, generateToken } from '../../utils/auth'
import { validateBody } from '../../utils/helpers'
import { getJwtSecret } from '../../utils/runtime-secrets'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(loginSchema, body)

  const user = await getUserByUsername(data.username)
  
  if (!user || !(await verifyPassword(data.password, user.password))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials'
    })
  }

  const token = generateToken(user, getJwtSecret())

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    }
  }
})
