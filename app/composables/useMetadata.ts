import type { AppContext } from './useAppContext'
import { showToastError, showToastSuccess } from '../utils/toast'

export function useMetadata(ctx: AppContext) {
  const { isPublic, apiCall, currentDestinationId, currentBucketName } = ctx

  const getObjectMetadata = async (
    key: string
  ): Promise<{
    metadata: Record<string, string>
    contentType?: string
    contentLength?: number
    lastModified?: Date
    etag?: string
  } | null> => {
    if (isPublic) return null
    if (!currentDestinationId.value || !currentBucketName.value) return null
    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value,
        key
      })
      const response = await apiCall(`/api/s3/metadata?${query}`)
      return {
        metadata: response.metadata || {},
        contentType: response.contentType,
        contentLength: response.contentLength,
        lastModified: response.lastModified
          ? new Date(response.lastModified)
          : undefined,
        etag: response.etag
      }
    } catch {
      return null
    }
  }

  const updateObjectMetadata = async (
    key: string,
    metadata: Record<string, string>
  ): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Update metadata is not available in public mode')
    }
    if (!currentDestinationId.value || !currentBucketName.value) return false
    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value,
        key
      })
      await apiCall(`/api/s3/metadata?${query}`, {
        method: 'PUT',
        body: JSON.stringify({ metadata })
      })
      showToastSuccess('Metadata updated', 'User metadata has been saved')
      return true
    } catch (error) {
      showToastError('Failed to update metadata', error)
      return false
    }
  }

  return {
    getObjectMetadata,
    updateObjectMetadata
  }
}
