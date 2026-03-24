import type { AppContext } from './useAppContext'
import { showToastError } from '../utils/toast'

export function useDestinations(ctx: AppContext) {
  const { isPublic, apiCall } = ctx

  const fetchAvailableDestinations = async () => {
    if (isPublic) {
      throw new Error(
        'fetchAvailableDestinations is not available in public mode'
      )
    }
    try {
      const response = await apiCall('/api/destinations/available')
      ctx.availableDestinations.value = response.destinations
      return response.destinations
    } catch (error) {
      showToastError('Error', error)
      throw error
    }
  }

  return {
    fetchAvailableDestinations
  }
}
