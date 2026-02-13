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

export interface S3Destination {
  id: string
  name: string
  slug: string
  region?: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketNames: string[]
  forcePathStyle?: boolean
  allowPublicAccess?: boolean
  allowedUserIds: string[]
  /** Metadata keys to display as columns in the file table */
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
  /** User metadata from S3 (populated when metadataColumns is configured for destination) */
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
  /** Metadata keys configured for this destination (for table columns) */
  metadataColumns?: string[]
}

export interface UploadProgress {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}
