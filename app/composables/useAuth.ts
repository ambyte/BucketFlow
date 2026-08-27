import type { User } from '../types'

export const useAuth = () => {
  const user = useState<User | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isEditor = computed(() =>
    ['admin', 'editor'].includes(user.value?.role || '')
  )
  const isViewer = computed(() => !isAuthenticated.value)

  const apiCall = async (endpoint: string, options: any = {}) => {
    if (!import.meta.client) {
      throw new Error('API calls can only be made from client side')
    }

    const url = `${window.location.origin}${endpoint}`
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error: any = new Error(
        errorData.statusMessage || `HTTP ${response.status}`
      )
      error.data = errorData
      error.statusCode = response.status
      if (
        response.status === 401
        && !endpoint.startsWith('/api/auth/')
      ) {
        user.value = null
        navigateTo('/login')
      }
      throw error
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }
    return null
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })

      user.value = response.user
      return true
    } catch (error: any) {
      const isRateLimited = error.statusCode === 429
      useToast().add({
        title: isRateLimited ? 'Too many attempts' : 'Login failed',
        description: error.message || (isRateLimited
          ? 'Please try again later.'
          : 'Invalid credentials'),
        color: 'error'
      })
      return false
    }
  }

  const logout = async () => {
    try {
      await apiCall('/api/auth/logout', { method: 'POST' })
    } catch {
      // Cookie is cleared server-side even if the request fails later
    }
    user.value = null
    if (import.meta.client) {
      localStorage.removeItem('s3fm-token')
      navigateTo('/login')
    }
  }

  const initAuth = async () => {
    try {
      if (import.meta.server) {
        const requestFetch = useRequestFetch()
        const response = await requestFetch<{ user: User }>('/api/auth/me')
        user.value = response.user
      } else {
        const response = await apiCall('/api/auth/me')
        user.value = response.user
      }
    } catch {
      user.value = null
      if (import.meta.client) {
        localStorage.removeItem('s3fm-token')
      }
    }
  }

  return {
    user: readonly(user),
    isAuthenticated,
    isAdmin,
    isEditor,
    isViewer,
    login,
    logout,
    initAuth,
    apiCall
  }
}
