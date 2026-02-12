import { getUsers } from '../../utils/storage'

export default defineEventHandler(async () => {
  const users = await getUsers()
  return {
    hasUsers: users.length > 0
  }
})
