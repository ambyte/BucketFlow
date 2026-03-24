import type { UploadProgress } from '../types'
import type { AppContext } from './useAppContext'
import { showToastError, showToastSuccess } from '../utils/toast'

export function useFiles(ctx: AppContext) {
  const {
    isPublic,
    apiCall,
    getIdentifier,
    buildApiEndpoint,
    buildQuery,
    currentDestinationId,
    currentHash,
    currentBucketName,
    currentPath,
    files,
    folders,
    metadataColumns,
    isLoading,
    uploadProgress
  } = ctx

  const authToken = useState<string | null>('auth-token', () => null)

  const getUploadIdentifier = () =>
    isPublic ? currentHash.value : currentDestinationId.value

  const fetchFiles = async (
    identifier: string,
    bucketName: string,
    prefix: string = ''
  ) => {
    if (!identifier || !bucketName) {
      throw new Error('Identifier and bucket name are required')
    }
    isLoading.value = true
    try {
      const query = buildQuery(identifier, {
        bucketName,
        prefix
      })
      const response = await apiCall(
        `${buildApiEndpoint('/s3/list')}?${query}`
      )

      files.value = response.files
      folders.value = response.folders
      metadataColumns.value = response.metadataColumns || []
      currentPath.value = prefix
      currentBucketName.value = bucketName

      if (isPublic) {
        currentHash.value = identifier
      } else {
        currentDestinationId.value = identifier
      }

      return response
    } catch (error: any) {
      if (!(isPublic && error?.statusCode === 403)) {
        showToastError('Error', error)
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const navigateToFolder = async (folderName: string) => {
    const identifier = getIdentifier()
    if (!identifier || !currentBucketName.value) return
    const newPath = currentPath.value + folderName + '/'
    await fetchFiles(identifier, currentBucketName.value, newPath)
  }

  const navigateUp = async () => {
    const identifier = getIdentifier()
    if (!identifier || !currentBucketName.value) return
    const pathParts = currentPath.value.split('/').filter(Boolean)
    pathParts.pop()
    const newPath = pathParts.length > 0 ? pathParts.join('/') + '/' : ''
    await fetchFiles(identifier, currentBucketName.value, newPath)
  }

  const downloadFile = async (key: string, filename: string) => {
    if (!import.meta.client) return

    const identifier = getIdentifier()
    if (!identifier || !currentBucketName.value) return

    try {
      const query = buildQuery(identifier, {
        bucketName: currentBucketName.value,
        filename
      })
      const apiResponse = await apiCall(
        `${buildApiEndpoint('/s3/objects')}/${encodeURIComponent(key)}?${query}`
      )
      const url = apiResponse.url

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToastSuccess('Download started', filename)
    } catch (error: any) {
      showToastError('Download failed', error)
    }
  }

  /** Helper to update a specific upload progress item immutably */
  const updateProgressItem = (
    progressId: string,
    updates: Partial<UploadProgress>
  ) => {
    const index = uploadProgress.value.findIndex(
      item => item.id === progressId
    )
    if (index === -1) return
    const current = uploadProgress.value[index]
    uploadProgress.value = [
      ...uploadProgress.value.slice(0, index),
      { ...current, ...updates } as UploadProgress,
      ...uploadProgress.value.slice(index + 1)
    ]
  }

  /** Helper to remove a specific upload progress item */
  const removeProgressItem = (progressId: string) => {
    uploadProgress.value = uploadProgress.value.filter(
      item => item.id !== progressId
    )
  }

  const uploadFile = async (file: File, path: string = '') => {
    const identifier = getUploadIdentifier()
    if (!identifier || !currentBucketName.value) {
      showToastError('Error', 'Please select destination and bucket')
      return false
    }

    const progressId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const progressItem: UploadProgress = {
      id: progressId,
      file,
      progress: 0,
      status: 'uploading'
    }

    uploadProgress.value = [...uploadProgress.value, progressItem]

    try {
      const key = path + file.name

      const query = buildQuery(identifier, {
        bucketName: currentBucketName.value
      })

      const { url } = await apiCall(
        `${buildApiEndpoint('/s3/upload-url')}?${query}`,
        {
          method: 'POST',
          body: JSON.stringify({
            key,
            contentType: file.type || 'application/octet-stream'
          })
        }
      )

      const xhr = new XMLHttpRequest()

      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total)
            updateProgressItem(progressId, { progress })
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          } else {
            reject(new Error('Upload failed'))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Upload failed')))

        xhr.open('PUT', url)
        xhr.setRequestHeader(
          'Content-Type',
          file.type || 'application/octet-stream'
        )
        xhr.send(file)
      })

      updateProgressItem(progressId, { progress: 100, status: 'completed' })
      showToastSuccess('Upload complete', file.name)

      const idAfter = getUploadIdentifier()
      if (idAfter && currentBucketName.value) {
        await fetchFiles(idAfter, currentBucketName.value, currentPath.value)
      }

      return true
    } catch (error: any) {
      updateProgressItem(progressId, {
        status: 'error',
        error: error.message || 'Upload failed'
      })
      showToastError('Upload failed', file.name)
      return false
    } finally {
      setTimeout(() => {
        const item = uploadProgress.value.find(i => i.id === progressId)
        if (item && item.status !== 'uploading') {
          removeProgressItem(progressId)
        }
      }, 3000)
    }
  }

  const deleteFile = async (key: string) => {
    if (isPublic) {
      throw new Error('Delete is not available in public mode')
    }

    if (!currentDestinationId.value || !currentBucketName.value) return false

    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value
      })
      await apiCall(`/api/s3/objects/${encodeURIComponent(key)}?${query}`, {
        method: 'DELETE'
      })

      showToastSuccess('File deleted', key.split('/').pop() || '')

      await fetchFiles(
        currentDestinationId.value,
        currentBucketName.value,
        currentPath.value
      )

      return true
    } catch (error: any) {
      showToastError('Delete failed', error)
      return false
    }
  }

  const renameFile = async (
    oldKey: string,
    newKey: string
  ): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Rename file is not available in public mode')
    }
    if (!currentDestinationId.value || !currentBucketName.value) return false
    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value
      })
      await apiCall(`/api/s3/objects/rename?${query}`, {
        method: 'POST',
        body: JSON.stringify({ oldKey, newKey })
      })
      const newName = newKey.split('/').pop() || ''
      showToastSuccess('File renamed', newName)
      await fetchFiles(
        currentDestinationId.value,
        currentBucketName.value,
        currentPath.value
      )
      return true
    } catch (error: any) {
      showToastError('Failed to rename file', error)
      return false
    }
  }

  const getPreviewUrl = async (key: string): Promise<string | null> => {
    const identifier = getIdentifier()
    if (!identifier || !currentBucketName.value) return null

    try {
      const query = buildQuery(identifier, {
        bucketName: currentBucketName.value
      })
      const response = await apiCall(
        `${buildApiEndpoint('/s3/objects')}/${encodeURIComponent(key)}?${query}`
      )
      return response.url
    } catch {
      return null
    }
  }

  const downloadZip = async (
    keys: string[],
    prefixes: string[],
    basePath: string,
    zipFilename?: string
  ) => {
    if (!import.meta.client) return

    const identifier = getIdentifier()
    if (!identifier || !currentBucketName.value) return

    const query = buildQuery(identifier, {
      bucketName: currentBucketName.value
    })
    const endpoint = `${buildApiEndpoint('/s3/download-zip')}?${query}`
    const url = `${window.location.origin}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (!isPublic && authToken.value) {
      headers.Authorization = `Bearer ${authToken.value}`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          keys,
          prefixes,
          basePath,
          ...(zipFilename ? { zipFilename } : {})
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as {
          statusMessage?: string
        }
        const err = new Error(
          errorData.statusMessage || `HTTP ${response.status}`
        ) as Error & { data?: unknown, statusCode?: number }
        err.data = errorData
        err.statusCode = response.status
        throw err
      }

      const blob = await response.blob()
      const dispo = response.headers.get('Content-Disposition')
      let filename = 'download.zip'
      if (dispo) {
        const utf8Star = /filename\*=UTF-8''([^;\n]+)/i.exec(dispo)
        if (utf8Star?.[1]) {
          try {
            filename = decodeURIComponent(utf8Star[1].trim())
          } catch {
            /* keep default */
          }
        } else {
          const quoted = /filename="((?:[^"\\]|\\.)*)"/.exec(dispo)
          if (quoted?.[1]) {
            filename = quoted[1].replace(/\\"/g, '"')
          }
        }
      }

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      showToastSuccess('Download started', filename)
    } catch (error: unknown) {
      showToastError('Download failed', error)
    }
  }

  return {
    fetchFiles,
    navigateToFolder,
    navigateUp,
    downloadFile,
    downloadZip,
    uploadFile,
    deleteFile,
    renameFile,
    getPreviewUrl
  }
}
