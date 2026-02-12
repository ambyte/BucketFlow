import { getUsers, createUser } from '../utils/storage'
import { hashPassword } from '../utils/auth'

function generatePassword(): string {
  return crypto.getRandomValues(new Uint8Array(5)).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '')
}

export default defineNitroPlugin(async () => {
  try {
    const users = await getUsers()

    if (users.length > 0) {
      return
    }

    const config = useRuntimeConfig()
    const username = config.adminUsername || 'admin'
    const password = config.adminPassword?.trim() || generatePassword()
    const hashedPassword = await hashPassword(password)
    const adminUser = await createUser({
      username,
      password: hashedPassword,
      role: 'admin'
    })

    console.log('[Init] Admin user created successfully.')
    console.log(`[Init] Username: ${adminUser.username}`)
    console.log(`[Init] Password: ${password}`)
    console.log('[Init] Save these credentials securely - the password cannot be recovered.')
  }
  catch (error) {
    console.error('[Init] Failed to initialize admin user:', error)
    throw error
  }
})
