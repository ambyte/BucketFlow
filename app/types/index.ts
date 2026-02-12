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
}

export interface FolderItem {
  Prefix: string
  name: string
}

export interface ListObjectsResult {
  files: FileItem[]
  folders: FolderItem[]
  commonPrefixes: string[]
}

export interface UploadProgress {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}
