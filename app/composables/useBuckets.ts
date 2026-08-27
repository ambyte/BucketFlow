import type { AppContext } from './useAppContext'
import { showToastError, showToastSuccess } from '../utils/toast'

export function useBuckets(ctx: AppContext) {
  const { isPublic, apiCall, buildApiEndpoint, buildQuery } = ctx

  const fetchBuckets = async (identifier: string) => {
    try {
      const query = buildQuery(identifier)
      const response = await apiCall(
        `${buildApiEndpoint('/s3/buckets')}?${query}`
      )
      return {
        buckets: (response.buckets || []) as string[],
        sizes: response.sizes as Record<string, number> | undefined
      }
    } catch (error) {
      showToastError('Error', error)
      throw error
    }
  }

  const createBucket = async (
    destinationId: string,
    bucketName: string
  ): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Create bucket is not available in public mode')
    }
    try {
      const query = new URLSearchParams({ id: destinationId })
      await apiCall(`/api/s3/buckets/create?${query}`, {
        method: 'POST',
        body: JSON.stringify({ bucketName })
      })
      showToastSuccess('Bucket created', bucketName)
      return true
    } catch (error) {
      showToastError('Failed to create bucket', error)
      return false
    }
  }

  const renameBucket = async (
    destinationId: string,
    oldBucketName: string,
    newBucketName: string
  ): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Rename bucket is not available in public mode')
    }
    try {
      const query = new URLSearchParams({ id: destinationId })
      await apiCall(`/api/s3/buckets/rename?${query}`, {
        method: 'POST',
        body: JSON.stringify({ oldBucketName, newBucketName })
      })
      showToastSuccess('Bucket renamed', `${oldBucketName} → ${newBucketName}`)
      return true
    } catch (error) {
      showToastError('Failed to rename bucket', error)
      return false
    }
  }

  const deleteBucket = async (
    destinationId: string,
    bucketName: string
  ): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Delete bucket is not available in public mode')
    }
    try {
      const query = new URLSearchParams({ id: destinationId })
      await apiCall(`/api/s3/buckets/delete?${query}`, {
        method: 'POST',
        body: JSON.stringify({ bucketName })
      })
      showToastSuccess('Bucket deleted', bucketName)
      return true
    } catch (error) {
      showToastError('Failed to delete bucket', error)
      return false
    }
  }

  return {
    fetchBuckets,
    createBucket,
    renameBucket,
    deleteBucket
  }
}
