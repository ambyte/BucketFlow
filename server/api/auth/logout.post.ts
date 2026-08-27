import { clearAuthCookie } from '../../utils/auth-cookie'

export default defineEventHandler(async (event) => {
  clearAuthCookie(event)
  return { success: true }
})
