import { z } from 'zod'
import { getUsers, createUser } from '../../utils/storage'
import { hashPassword } from '../../utils/auth'
import { validateBody } from '../../utils/helpers'
import { rateLimit } from '../../utils/rate-limit'

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export default defineEventHandler(async (event) => {
  rateLimit(event, { name: 'register', max: 5, windowMs: 15 * 60 * 1000 })

  const users = await getUsers()
  if (users.length > 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Registration is disabled. Users already exist.'
    })
  }

  const body = await readBody(event)
  const data = validateBody(registerSchema, body)

  const hashedPassword = await hashPassword(data.password)
  const user = await createUser({
    username: data.username,
    password: hashedPassword,
    role: 'admin'
  })

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }
})
