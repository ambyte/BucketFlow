export default defineNuxtRouteMiddleware(async (to) => {
  const { token, isAuthenticated, initAuth } = useAuth()
  
  await initAuth()
  
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
  
  if (to.path === '/admin') {
    const { user } = useAuth()
    if (user.value?.role !== 'admin') {
      return navigateTo('/')
    }
  }
})
