export type UserRole = 'admin' | 'editor'

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface JwtPayload {
  userId: string
  username: string
  role: UserRole
  iat: number
  exp: number
}

export interface PublicLink {
  id: string
  hash: string
  destinationId: string
  bucketName: string
  path: string
  allowFileUpload?: boolean
  allowFolderCreation?: boolean
  expiresAt?: string
  createdAt: string
  createdBy?: string
}

export interface S3Destination {
  id: string
  name: string
  region?: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketNames: string[]
  forcePathStyle?: boolean
  allowPublicAccess?: boolean
  allowedUserIds: string[]
  metadataColumns?: string[]
  createdAt: string
  updatedAt: string
}

export interface FileItem {
  Key: string
  Size: number
  LastModified: Date
  ETag: string
  StorageClass: string
  isFolder?: boolean
  name: string
  Metadata?: Record<string, string>
}

export interface FolderItem {
  Prefix: string
  name: string
}

export interface ListObjectsResult {
  files: FileItem[]
  folders: FolderItem[]
  commonPrefixes: string[]
  metadataColumns?: string[]
}

export interface UploadProgress {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export interface TableRow {
  name: string
  isFolder?: boolean
  Key?: string
  Prefix?: string
  Size: number
  LastModified: Date
  ETag?: string
  StorageClass?: string
  Metadata?: Record<string, string>
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
}

export interface ApiError {
  message: string
  statusMessage?: string
  statusCode?: number
  data?: unknown
}
