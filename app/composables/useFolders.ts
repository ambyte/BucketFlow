import type { AppContext } from './useAppContext'
import { showToastError, showToastSuccess } from '../utils/toast'

export function useFolders(
  ctx: AppContext,
  fetchFiles: (
    identifier: string,
    bucketName: string,
    prefix: string
  ) => Promise<any>
) {
  const {
    isPublic,
    apiCall,
    getIdentifier,
    buildApiEndpoint,
    buildQuery,
    currentDestinationId,
    currentHash,
    currentBucketName,
    currentPath
  } = ctx

  const getFolderIdentifier = () =>
    isPublic ? currentHash.value : currentDestinationId.value

  const createFolder = async (folderName: string) => {
    const identifier = getFolderIdentifier()
    if (!identifier || !currentBucketName.value) {
      showToastError('Error', 'Please select destination and bucket')
      return false
    }

    const key = currentPath.value + folderName + '/'

    try {
      const query = buildQuery(identifier, {
        bucketName: currentBucketName.value
      })

      const { url } = await apiCall(
        `${buildApiEndpoint('/s3/upload-url')}?${query}`,
        {
          method: 'POST',
          body: JSON.stringify({
            key,
            contentType: 'application/x-directory'
          })
        }
      )

      await fetch(url, {
        method: 'PUT',
        body: new Blob([]),
        headers: {
          'Content-Type': 'application/x-directory'
        }
      })

      showToastSuccess('Folder created', folderName)

      const idAfter = getFolderIdentifier()
      if (idAfter && currentBucketName.value) {
        await fetchFiles(idAfter, currentBucketName.value, currentPath.value)
      }

      return true
    } catch (error) {
      showToastError('Failed to create folder', error)
      return false
    }
  }

  const getFolderContentsCount = async (prefix: string): Promise<number> => {
    if (isPublic) return 0
    if (!currentDestinationId.value || !currentBucketName.value) return 0
    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value,
        prefix
      })
      const response = await apiCall(`/api/s3/folders/count?${query}`)
      return response.count ?? 0
    } catch {
      return 0
    }
  }

  const deleteFolder = async (prefix: string): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Delete folder is not available in public mode')
    }
    if (!currentDestinationId.value || !currentBucketName.value) return false
    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value
      })
      const response = await apiCall(`/api/s3/folders/delete?${query}`, {
        method: 'POST',
        body: JSON.stringify({ prefix })
      })
      const folderName = prefix.split('/').filter(Boolean).pop() || 'folder'
      showToastSuccess(
        'Folder deleted',
        `${folderName} (${response.deletedCount ?? 0} items)`
      )
      await fetchFiles(
        currentDestinationId.value,
        currentBucketName.value,
        currentPath.value
      )
      return true
    } catch (error) {
      showToastError('Failed to delete folder', error)
      return false
    }
  }

  const renameFolder = async (
    oldPrefix: string,
    newPrefix: string
  ): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Rename folder is not available in public mode')
    }
    if (!currentDestinationId.value || !currentBucketName.value) return false
    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value
      })
      await apiCall(`/api/s3/folders/rename?${query}`, {
        method: 'POST',
        body: JSON.stringify({ oldPrefix, newPrefix })
      })
      const newName = newPrefix.split('/').filter(Boolean).pop() || ''
      showToastSuccess('Folder renamed', newName)
      await fetchFiles(
        currentDestinationId.value,
        currentBucketName.value,
        currentPath.value
      )
      return true
    } catch (error) {
      showToastError('Failed to rename folder', error)
      return false
    }
  }

  return {
    createFolder,
    getFolderContentsCount,
    deleteFolder,
    renameFolder
  }
}
