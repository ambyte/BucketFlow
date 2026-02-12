import type { ListObjectsResult, FileItem, UploadProgress, S3Destination } from '../types'

interface UseS3Options {
  isPublic?: boolean
}

export const useS3 = (options: UseS3Options = {}) => {
  const isPublic = options.isPublic ?? false

  // Always initialize auth (it's safe to call even in public mode)
  // but only use it in private mode
  let authApiCall: ((endpoint: string, options?: any) => Promise<any>) | null = null
  try {
    const auth = useAuth()
    authApiCall = auth.apiCall
  } catch {
    // Auth might not be available in public mode, that's okay
  }

  // Public API call function
  const publicApiCall = async (endpoint: string, options: any = {}) => {
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

  // Select appropriate API call based on mode
  const apiCall = isPublic ? publicApiCall : (authApiCall || publicApiCall)

  // State keys with prefix based on mode
  const statePrefix = isPublic ? 'public-s3' : 's3'

  const currentDestinationId = useState<string | null>(`${statePrefix}-current-destination-id`, () => null)
  const currentSlug = useState<string | null>(`${statePrefix}-slug`, () => null)
  const currentBucketName = useState<string | null>(`${statePrefix}-current-bucket-name`, () => null)
  const currentPath = useState<string>(`${statePrefix}-current-path`, () => '')
  const files = useState<FileItem[]>(`${statePrefix}-files`, () => [])
  const folders = useState<any[]>(`${statePrefix}-folders`, () => [])
  const isLoading = useState<boolean>(`${statePrefix}-loading`, () => false)
  const uploadProgress = useState<UploadProgress[]>(`${statePrefix}-upload-progress`, () => [])
  const availableDestinations = useState<Omit<S3Destination, 'secretAccessKey' | 'accessKeyId'>[]>(`${statePrefix}-available-destinations`, () => [])

  // Helper functions to reduce isPublic checks
  const getIdentifier = () => isPublic ? currentSlug.value : currentDestinationId.value
  const getIdentifierKey = () => isPublic ? 'slug' : 'id'
  const buildApiEndpoint = (path: string) => isPublic ? `/api/public${path}` : `/api${path}`
  const buildQuery = (identifier: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ [getIdentifierKey()]: identifier, ...params })
    return query
  }

  const fetchAvailableDestinations = async () => {
    if (isPublic) {
      throw new Error('fetchAvailableDestinations is not available in public mode')
    }

    try {
      const response = await apiCall('/api/destinations/available')
      availableDestinations.value = response.destinations
      return response.destinations
    }
    catch (error: any) {
      useToast().add({
        title: 'Error',
        description: error.message || 'Failed to load destinations',
        color: 'error'
      })
      throw error
    }
  }

  const fetchDestination = async (slug: string) => {
    if (!isPublic) {
      throw new Error('fetchDestination is only available in public mode')
    }

    try {
      const response = await apiCall(`/api/public/destinations/${slug}`)
      return response
    }
    catch (error: any) {
      useToast().add({
        title: 'Error',
        description: error.message || 'Failed to load destination',
        color: 'error'
      })
      throw error
    }
  }

  const fetchBuckets = async (identifier: string) => {
    try {
      const query = buildQuery(identifier)
      const response = await apiCall(`${buildApiEndpoint('/s3/buckets')}?${query}`)
      return response.buckets || []
    }
    catch (error: any) {
      useToast().add({
        title: 'Error',
        description: error.message || 'Failed to load buckets',
        color: 'error'
      })
      throw error
    }
  }

  const fetchFiles = async (identifier: string, bucketName: string, prefix: string = '') => {
    if (!identifier || !bucketName) {
      throw new Error('Identifier and bucket name are required')
    }

    isLoading.value = true
    try {
      const query = buildQuery(identifier, { bucketName, prefix, delimiter: '/' })
      const response = await apiCall(`${buildApiEndpoint('/s3/list')}?${query}`)

      files.value = response.files
      folders.value = response.folders
      currentPath.value = prefix
      currentBucketName.value = bucketName

      // Update the appropriate identifier state
      if (isPublic) {
        currentSlug.value = identifier
      } else {
        currentDestinationId.value = identifier
      }

      return response
    }
    catch (error: any) {
      useToast().add({
        title: 'Error',
        description: error.message || 'Failed to load files',
        color: 'error'
      })
      throw error
    }
    finally {
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
      const query = buildQuery(identifier, { bucketName: currentBucketName.value, filename })
      const apiResponse = await apiCall(`${buildApiEndpoint('/s3/objects')}/${encodeURIComponent(key)}?${query}`)
      const url = apiResponse.url

      // Direct download from S3 — browser fetches from presigned URL, no proxy via app
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      useToast().add({
        title: 'Download started',
        description: filename,
        color: 'success'
      })
    }
    catch (error: any) {
      useToast().add({
        title: 'Download failed',
        description: error.message || 'Failed to download file',
        color: 'error'
      })
    }
  }

  const uploadFile = async (file: File, path: string = '') => {
    if (isPublic) {
      throw new Error('Upload is not available in public mode')
    }

    if (!currentDestinationId.value || !currentBucketName.value) {
      useToast().add({
        title: 'Error',
        description: 'Please select destination and bucket',
        color: 'error'
      })
      return false
    }

    const progressId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const progressItem: UploadProgress = {
      id: progressId,
      file,
      progress: 0,
      status: 'uploading'
    }

    uploadProgress.value.push(progressItem)

    try {
      const key = path + file.name

      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value
      })

      const { url } = await apiCall(`/api/s3/upload-url?${query}`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          contentType: file.type || 'application/octet-stream'
        })
      })

      const xhr = new XMLHttpRequest()

      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total)
            const index = uploadProgress.value.findIndex(item => item.id === progressId)
            const currentItem = index !== -1 ? uploadProgress.value[index] : null
            if (currentItem) {
              // Create new array to ensure reactivity
              uploadProgress.value = [
                ...uploadProgress.value.slice(0, index),
                {
                  id: currentItem.id,
                  file: currentItem.file,
                  progress,
                  status: currentItem.status
                },
                ...uploadProgress.value.slice(index + 1)
              ]
            }
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
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      const index = uploadProgress.value.findIndex(item => item.id === progressId)
      const currentItem = index !== -1 ? uploadProgress.value[index] : null
      if (currentItem) {
        // Create new array to ensure reactivity
        uploadProgress.value = [
          ...uploadProgress.value.slice(0, index),
          {
            id: currentItem.id,
            file: currentItem.file,
            progress: 100,
            status: 'completed' as const
          },
          ...uploadProgress.value.slice(index + 1)
        ]
      }

      useToast().add({
        title: 'Upload complete',
        description: file.name,
        color: 'success'
      })

      if (currentDestinationId.value && currentBucketName.value) {
        await fetchFiles(currentDestinationId.value, currentBucketName.value, currentPath.value)
      }

      return true
    }
    catch (error: any) {
      const index = uploadProgress.value.findIndex(item => item.id === progressId)
      const currentItem = index !== -1 ? uploadProgress.value[index] : null
      if (currentItem) {
        // Create new array to ensure reactivity
        uploadProgress.value = [
          ...uploadProgress.value.slice(0, index),
          {
            id: currentItem.id,
            file: currentItem.file,
            progress: currentItem.progress,
            status: 'error' as const,
            error: error.message || 'Upload failed'
          },
          ...uploadProgress.value.slice(index + 1)
        ]
      }

      useToast().add({
        title: 'Upload failed',
        description: file.name,
        color: 'error'
      })

      return false
    }
    finally {
      setTimeout(() => {
        const index = uploadProgress.value.findIndex(item => item.id === progressId)
        const currentItem = index !== -1 ? uploadProgress.value[index] : null
        if (currentItem && currentItem.status !== 'uploading') {
          uploadProgress.value.splice(index, 1)
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

      useToast().add({
        title: 'File deleted',
        description: key.split('/').pop() || '',
        color: 'success'
      })

      await fetchFiles(currentDestinationId.value, currentBucketName.value, currentPath.value)

      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Delete failed',
        description: error.message || 'Failed to delete file',
        color: 'error'
      })
      return false
    }
  }

  const createFolder = async (folderName: string) => {
    if (isPublic) {
      throw new Error('Create folder is not available in public mode')
    }

    if (!currentDestinationId.value || !currentBucketName.value) {
      useToast().add({
        title: 'Error',
        description: 'Please select destination and bucket',
        color: 'error'
      })
      return false
    }

    const key = currentPath.value + folderName + '/'

    try {
      const query = new URLSearchParams({
        id: currentDestinationId.value,
        bucketName: currentBucketName.value
      })

      const { url } = await apiCall(`/api/s3/upload-url?${query}`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          contentType: 'application/x-directory'
        })
      })

      await fetch(url, {
        method: 'PUT',
        body: new Blob([]),
        headers: {
          'Content-Type': 'application/x-directory'
        }
      })

      useToast().add({
        title: 'Folder created',
        description: folderName,
        color: 'success'
      })

      if (currentDestinationId.value && currentBucketName.value) {
        await fetchFiles(currentDestinationId.value, currentBucketName.value, currentPath.value)
      }

      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Failed to create folder',
        description: error.message || 'Unknown error',
        color: 'error'
      })
      return false
    }
  }

  const getPreviewUrl = async (key: string): Promise<string | null> => {
    const identifier = getIdentifier()
    if (!identifier || !currentBucketName.value) return null

    try {
      const query = buildQuery(identifier, { bucketName: currentBucketName.value })
      const response = await apiCall(`${buildApiEndpoint('/s3/objects')}/${encodeURIComponent(key)}?${query}`)
      return response.url
    }
    catch {
      return null
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
    }
    catch {
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
      useToast().add({
        title: 'Folder deleted',
        description: `${folderName} (${response.deletedCount ?? 0} items)`,
        color: 'success'
      })
      await fetchFiles(currentDestinationId.value, currentBucketName.value, currentPath.value)
      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Failed to delete folder',
        description: error.message || 'Unknown error',
        color: 'error'
      })
      return false
    }
  }

  const renameFolder = async (oldPrefix: string, newPrefix: string): Promise<boolean> => {
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
      useToast().add({
        title: 'Folder renamed',
        description: newName,
        color: 'success'
      })
      await fetchFiles(currentDestinationId.value, currentBucketName.value, currentPath.value)
      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Failed to rename folder',
        description: error.message || 'Unknown error',
        color: 'error'
      })
      return false
    }
  }

  const renameFile = async (oldKey: string, newKey: string): Promise<boolean> => {
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
      useToast().add({
        title: 'File renamed',
        description: newName,
        color: 'success'
      })
      await fetchFiles(currentDestinationId.value, currentBucketName.value, currentPath.value)
      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Failed to rename file',
        description: error.message || 'Unknown error',
        color: 'error'
      })
      return false
    }
  }

  const createBucket = async (destinationId: string, bucketName: string): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Create bucket is not available in public mode')
    }

    try {
      const query = new URLSearchParams({ id: destinationId })
      await apiCall(`/api/s3/buckets/create?${query}`, {
        method: 'POST',
        body: JSON.stringify({ bucketName })
      })

      useToast().add({
        title: 'Bucket created',
        description: bucketName,
        color: 'success'
      })

      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Failed to create bucket',
        description: error.message || 'Unknown error',
        color: 'error'
      })
      return false
    }
  }

  const renameBucket = async (destinationId: string, oldBucketName: string, newBucketName: string): Promise<boolean> => {
    if (isPublic) {
      throw new Error('Rename bucket is not available in public mode')
    }

    try {
      const query = new URLSearchParams({ id: destinationId })
      await apiCall(`/api/s3/buckets/rename?${query}`, {
        method: 'POST',
        body: JSON.stringify({ oldBucketName, newBucketName })
      })

      useToast().add({
        title: 'Bucket renamed',
        description: `${oldBucketName} → ${newBucketName}`,
        color: 'success'
      })

      return true
    }
    catch (error: any) {
      useToast().add({
        title: 'Failed to rename bucket',
        description: error.message || 'Unknown error',
        color: 'error'
      })
      return false
    }
  }

  return {
    currentDestinationId: readonly(currentDestinationId),
    currentSlug: readonly(currentSlug),
    currentBucketName: readonly(currentBucketName),
    currentPath: readonly(currentPath),
    files: readonly(files),
    folders: readonly(folders),
    isLoading: readonly(isLoading),
    uploadProgress: readonly(uploadProgress),
    availableDestinations: readonly(availableDestinations),
    fetchAvailableDestinations,
    fetchDestination,
    fetchBuckets,
    fetchFiles,
    navigateToFolder,
    navigateUp,
    downloadFile,
    uploadFile,
    deleteFile,
    createFolder,
    createBucket,
    renameBucket,
    getPreviewUrl,
    getFolderContentsCount,
    deleteFolder,
    renameFolder,
    renameFile
  }
}
