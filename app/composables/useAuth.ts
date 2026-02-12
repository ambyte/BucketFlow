import type { User, UserRole, JwtPayload } from '../types'

export const useAuth = () => {
  const token = useState<string | null>('auth-token', () => null)
  const user = useState<User | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isEditor = computed(() => ['admin', 'editor'].includes(user.value?.role || ''))
  const isViewer = computed(() => !isAuthenticated.value)

  const apiCall = async (endpoint: string, options: any = {}) => {
    if (!process.client) {
      throw new Error('API calls can only be made from client side')
    }

    const url = `${window.location.origin}${endpoint}`
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error: any = new Error(errorData.statusMessage || `HTTP ${response.status}`)
      error.data = errorData
      error.statusCode = response.status
      throw error
    }

    return response.json()
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })

      token.value = response.token
      user.value = response.user

      if (process.client) {
        localStorage.setItem('s3fm-token', response.token)
      }

      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        color: 'error'
      })
      return false
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    if (process.client) {
      localStorage.removeItem('s3fm-token')
      navigateTo('/login')
    }
  }

  const initAuth = async () => {
    if (process.client) {
      const savedToken = localStorage.getItem('s3fm-token')
      if (savedToken) {
        token.value = savedToken
        try {
          const response = await apiCall('/api/auth/me')
          user.value = response.user
        }
        catch {
          logout()
        }
      }
    }
  }

  const hasPermission = (requiredRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = {
      admin: 2,
      editor: 1,
    }

    const userRole = user.value?.role || 'editor'
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  return {
    token: readonly(token),
    user: readonly(user),
    isAuthenticated,
    isAdmin,
    isEditor,
    isViewer,
    login,
    logout,
    initAuth,
    hasPermission,
    apiCall
  }
}
