import { readonly } from 'vue'
import type { FileItem, UploadProgress, S3Destination } from '../types'
import { useDestinations } from './useDestinations'
import { useBuckets } from './useBuckets'
import { useFiles } from './useFiles'
import { useFolders } from './useFolders'
import { useMetadata } from './useMetadata'
import { usePublicLinks } from './usePublicLinks'

export interface UseAppContextOptions {
  isPublic?: boolean
}

export interface AppContext {
  isPublic: boolean
  apiCall: (endpoint: string, options?: any) => Promise<any>
  authApiCall: ((endpoint: string, options?: any) => Promise<any>) | null
  statePrefix: string
  currentDestinationId: ReturnType<typeof useState<string | null>>
  currentHash: ReturnType<typeof useState<string | null>>
  currentBucketName: ReturnType<typeof useState<string | null>>
  currentPath: ReturnType<typeof useState<string>>
  files: ReturnType<typeof useState<FileItem[]>>
  folders: ReturnType<typeof useState<any[]>>
  metadataColumns: ReturnType<typeof useState<string[]>>
  isLoading: ReturnType<typeof useState<boolean>>
  uploadProgress: ReturnType<typeof useState<UploadProgress[]>>
  availableDestinations: ReturnType<
    typeof useState<Omit<S3Destination, 'secretAccessKey' | 'accessKeyId'>[]>
  >
  getIdentifier: () => string | null
  getIdentifierKey: () => string
  buildApiEndpoint: (path: string) => string
  buildQuery: (
    identifier: string,
    params?: Record<string, string>
  ) => URLSearchParams
}

function useAppContextBase(options: UseAppContextOptions = {}): AppContext {
  const isPublic = options.isPublic ?? false

  let authApiCall: ((endpoint: string, options?: any) => Promise<any>) | null
    = null
  try {
    const auth = useAuth()
    authApiCall = auth.apiCall
  } catch {
    // Auth might not be available in public mode
  }

  const publicApiCall = async (endpoint: string, options: any = {}) => {
    if (!import.meta.client) {
      throw new Error('API calls can only be made from client side')
    }
    const url = `${window.location.origin}${endpoint}`
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    const response = await fetch(url, { ...options, headers })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error: any = new Error(
        errorData.statusMessage || `HTTP ${response.status}`
      )
      error.data = errorData
      error.statusCode = response.status
      throw error
    }
    return response.json()
  }

  const apiCall = isPublic ? publicApiCall : authApiCall || publicApiCall
  const statePrefix = isPublic ? 'public-s3' : 's3'

  const currentDestinationId = useState<string | null>(
    `${statePrefix}-current-destination-id`,
    () => null
  )
  const currentHash = useState<string | null>(
    `${statePrefix}-hash`,
    () => null
  )
  const currentBucketName = useState<string | null>(
    `${statePrefix}-current-bucket-name`,
    () => null
  )
  const currentPath = useState<string>(`${statePrefix}-current-path`, () => '')
  const files = useState<FileItem[]>(`${statePrefix}-files`, () => [])
  const folders = useState<any[]>(`${statePrefix}-folders`, () => [])
  const metadataColumns = useState<string[]>(
    `${statePrefix}-metadata-columns`,
    () => []
  )
  const isLoading = useState<boolean>(`${statePrefix}-loading`, () => false)
  const uploadProgress = useState<UploadProgress[]>(
    `${statePrefix}-upload-progress`,
    () => []
  )
  const availableDestinations = useState<
    Omit<S3Destination, 'secretAccessKey' | 'accessKeyId'>[]
  >(`${statePrefix}-available-destinations`, () => [])

  const getIdentifier = () =>
    isPublic ? currentHash.value : currentDestinationId.value
  const getIdentifierKey = () => (isPublic ? 'hash' : 'id')
  const buildApiEndpoint = (path: string) =>
    isPublic ? `/api/public${path}` : `/api${path}`
  const buildQuery = (
    identifier: string,
    params: Record<string, string> = {}
  ) => {
    return new URLSearchParams({ [getIdentifierKey()]: identifier, ...params })
  }

  return {
    isPublic,
    apiCall,
    authApiCall,
    statePrefix,
    currentDestinationId,
    currentHash,
    currentBucketName,
    currentPath,
    files,
    folders,
    metadataColumns,
    isLoading,
    uploadProgress,
    availableDestinations,
    getIdentifier,
    getIdentifierKey,
    buildApiEndpoint,
    buildQuery
  }
}

export const useAppContext = (options: UseAppContextOptions = {}) => {
  const ctx = useAppContextBase(options)
  const destinations = useDestinations(ctx)
  const buckets = useBuckets(ctx)
  const files = useFiles(ctx)
  const folders = useFolders(ctx, files.fetchFiles)
  const metadata = useMetadata(ctx)
  const publicLinks = usePublicLinks(ctx)

  return {
    currentDestinationId: readonly(ctx.currentDestinationId),
    currentHash: readonly(ctx.currentHash),
    currentBucketName: readonly(ctx.currentBucketName),
    currentPath: readonly(ctx.currentPath),
    files: readonly(ctx.files),
    folders: readonly(ctx.folders),
    metadataColumns: readonly(ctx.metadataColumns),
    isLoading: readonly(ctx.isLoading),
    uploadProgress: readonly(ctx.uploadProgress),
    availableDestinations: readonly(ctx.availableDestinations),
    ...destinations,
    ...buckets,
    ...files,
    ...folders,
    ...metadata,
    ...publicLinks
  }
}
