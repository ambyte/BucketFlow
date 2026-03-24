import type { PublicLink } from '../types'
import type { AppContext } from './useAppContext'

export function usePublicLinks(ctx: AppContext) {
  const { isPublic, authApiCall, apiCall } = ctx

  const createPublicLink = async (
    destinationId: string,
    bucketName: string,
    path: string = '',
    options?: {
      allowFileUpload?: boolean
      allowFolderCreation?: boolean
      expiresAt?: string
    },
    requestOptions?: { hash?: string, draft?: boolean }
  ): Promise<PublicLink | null> => {
    if (isPublic) {
      throw new Error('Create public link is not available in public mode')
    }
    if (!authApiCall) return null
    const res = await authApiCall('/api/links', {
      method: 'POST',
      body: JSON.stringify({
        destinationId,
        bucketName,
        path,
        allowFileUpload: options?.allowFileUpload ?? false,
        allowFolderCreation: options?.allowFolderCreation ?? false,
        expiresAt: options?.expiresAt,
        hash: requestOptions?.hash,
        draft: requestOptions?.draft ?? false
      })
    })
    return res.link
  }

  const fetchPublicLinks = async (
    destinationId: string
  ): Promise<PublicLink[]> => {
    if (isPublic) {
      throw new Error('Fetch public links is not available in public mode')
    }
    if (!authApiCall) return []
    const res = await authApiCall(
      `/api/links?destinationId=${encodeURIComponent(destinationId)}`
    )
    return res.links || []
  }

  const updatePublicLink = async (
    id: string,
    updates: { allowFileUpload?: boolean, allowFolderCreation?: boolean, expiresAt?: string | null }
  ): Promise<PublicLink | null> => {
    if (isPublic) {
      throw new Error('Update public link is not available in public mode')
    }
    if (!authApiCall) return null
    const res = await authApiCall(`/api/links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
    return res.link
  }

  const deletePublicLink = async (id: string): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Delete public link is not available in public mode')
    }
    if (!authApiCall) return false
    await authApiCall(`/api/links/${id}`, { method: 'DELETE' })
    return true
  }

  const resolvePublicLink = async (
    hash: string
  ): Promise<{
    hash: string
    bucket: string
    path: string
    allowFileUpload: boolean
    allowFolderCreation: boolean
  } | null> => {
    if (!isPublic) {
      throw new Error('resolvePublicLink is only available in public mode')
    }
    try {
      const response = await apiCall(
        `/api/public/links/${encodeURIComponent(hash)}`
      )
      return {
        hash: hash,
        bucket: response.bucket,
        path: response.path,
        allowFileUpload: response.allowFileUpload ?? false,
        allowFolderCreation: response.allowFolderCreation ?? false
      }
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 410) throw err
      return null
    }
  }

  return {
    createPublicLink,
    updatePublicLink,
    fetchPublicLinks,
    deletePublicLink,
    resolvePublicLink
  }
}
