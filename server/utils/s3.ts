import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, CopyObjectCommand, HeadObjectCommand, CreateBucketCommand, DeleteBucketCommand, type ListObjectsV2CommandInput } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { FileItem, FolderItem, ListObjectsResult, S3Destination } from '../../app/types'

let s3Client: S3Client | null = null
let currentConfig: S3Destination | null = null

export function getS3Client(destination: S3Destination): S3Client {
  if (!destination) {
    throw new Error('S3Destination is required')
  }

  if (s3Client && currentConfig && JSON.stringify(currentConfig) === JSON.stringify(destination)) {
    return s3Client
  }

  if (!destination.region) {
    destination.region = 'us-east-1'
  }

  if (!destination.endpoint) {
    throw new Error('Endpoint is required')
  }

  if (!destination.accessKeyId) {
    throw new Error('Access key ID is required')
  }

  if (!destination.secretAccessKey) {
    throw new Error('Secret access key is required')
  }

  s3Client = new S3Client({
    region: destination.region,
    endpoint: destination.endpoint,
    credentials: {
      accessKeyId: destination.accessKeyId,
      secretAccessKey: destination.secretAccessKey
    },
    forcePathStyle: destination.forcePathStyle ?? true
  })

  currentConfig = destination
  return s3Client
}

export async function testS3Connection(destination: S3Destination): Promise<{ success: boolean; message: string; buckets?: string[] }> {
  try {
    const client = getS3Client(destination)
    const command = new ListBucketsCommand({})
    const response = await client.send(command)

    const buckets = response.Buckets?.map(b => b.Name || '') || []

    return {
      success: true,
      message: 'Connection successful',
      buckets
    }
  }
  catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function listBuckets(destination: S3Destination, bucketNames?: string[]): Promise<string[]> {
  const client = getS3Client(destination)
  const command = new ListBucketsCommand({})
  const response = await client.send(command)
  const allBuckets = response.Buckets?.map(b => b.Name || '').filter(Boolean) || []

  if (!bucketNames || bucketNames.length === 0) {
    return allBuckets
  }

  // Фильтруем бакеты по списку bucketNames
  return allBuckets.filter(bucket => bucketNames.includes(bucket))
}

export async function listObjects(destination: S3Destination, bucketName: string, prefix: string = '', delimiter: string = '/'): Promise<ListObjectsResult> {
  const client = getS3Client(destination)

  const params: ListObjectsV2CommandInput = {
    Bucket: bucketName,
    Prefix: prefix,
    Delimiter: delimiter
  }

  const command = new ListObjectsV2Command(params)
  const response = await client.send(command)

  const metadataColumns = destination.metadataColumns?.filter(k => k?.trim()) || []

  const files: FileItem[] = await Promise.all(
    (response.Contents || [])
      .filter(obj => obj.Key !== prefix)
      .map(async (obj) => {
        const key = obj.Key || ''
        const name = key.replace(prefix, '').replace(/\/$/, '') || ''
        const file: FileItem = {
          Key: key,
          Size: obj.Size || 0,
          LastModified: obj.LastModified || new Date(),
          ETag: obj.ETag || '',
          StorageClass: obj.StorageClass || 'STANDARD',
          name
        }
        if (metadataColumns.length > 0) {
          try {
            const head = await getObjectMetadata(destination, bucketName, key)
            const metadata: Record<string, string> = {}
            if (head.Metadata) {
              for (const [k, v] of Object.entries(head.Metadata)) {
                if (typeof v === 'string') metadata[k] = v
              }
            }
            file.Metadata = metadata
          }
          catch {
            file.Metadata = {}
          }
        }
        return file
      })
  )

  const folders: FolderItem[] = (response.CommonPrefixes || [])
    .map(commonPrefix => ({
      Prefix: commonPrefix.Prefix || '',
      name: commonPrefix.Prefix?.replace(prefix, '').replace(/\/$/, '') || ''
    }))

  return {
    files,
    folders,
    commonPrefixes: response.CommonPrefixes?.map(p => p.Prefix || '') || [],
    metadataColumns: metadataColumns.length > 0 ? metadataColumns : undefined
  }
}

export async function getPresignedDownloadUrl(destination: S3Destination, bucketName: string, key: string, expiresIn: number = 3600, downloadFilename?: string): Promise<string> {
  const client = getS3Client(destination)
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ...(downloadFilename && {
      ResponseContentDisposition: `attachment; filename="${downloadFilename.replace(/"/g, '\\"')}"`
    })
  })

  return getSignedUrl(client, command, { expiresIn })
}

export async function getPresignedUploadUrl(destination: S3Destination, bucketName: string, key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
  const client = getS3Client(destination)
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType
  })

  return getSignedUrl(client, command, { expiresIn })
}

export async function uploadFile(destination: S3Destination, bucketName: string, key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getS3Client(destination)
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType
  })

  await client.send(command)
}

export async function createBucket(destination: S3Destination, bucketName: string): Promise<void> {
  const client = getS3Client(destination)
  const command = new CreateBucketCommand({
    Bucket: bucketName
  })

  await client.send(command)
}

export async function deleteObject(destination: S3Destination, bucketName: string, key: string): Promise<void> {
  const client = getS3Client(destination)
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  })

  await client.send(command)
}

export async function deleteObjects(destination: S3Destination, bucketName: string, keys: string[]): Promise<void> {
  const client = getS3Client(destination)
  const command = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: {
      Objects: keys.map(key => ({ Key: key }))
    }
  })

  await client.send(command)
}

export async function getObjectMetadata(destination: S3Destination, bucketName: string, key: string) {
  const client = getS3Client(destination)
  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key
  })

  return await client.send(command)
}

/** List all object keys under a prefix recursively (no delimiter) */
export async function listAllKeysUnderPrefix(destination: S3Destination, bucketName: string, prefix: string): Promise<string[]> {
  const client = getS3Client(destination)
  const keys: string[] = []
  let continuationToken: string | undefined
  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: undefined,
      ContinuationToken: continuationToken
    })
    const response = await client.send(command)
    for (const obj of response.Contents || []) {
      if (obj.Key) keys.push(obj.Key)
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)
  return keys
}

export async function copyObject(destination: S3Destination, bucketName: string, sourceKey: string, destKey: string): Promise<void> {
  const client = getS3Client(destination)
  const command = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: encodeURI(`${bucketName}/${sourceKey}`),
    Key: destKey
  })
  await client.send(command)
}

/** Copy object to itself with new user metadata (updates metadata without re-uploading content) */
export async function copyObjectWithMetadata(destination: S3Destination, bucketName: string, key: string, metadata: Record<string, string>): Promise<void> {
  const client = getS3Client(destination)
  const command = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: encodeURI(`${bucketName}/${key}`),
    Key: key,
    Metadata: metadata,
    MetadataDirective: 'REPLACE'
  })
  await client.send(command)
}

const DELETE_BATCH_SIZE = 1000

export async function deleteFolder(destination: S3Destination, bucketName: string, prefix: string): Promise<{ deletedCount: number }> {
  const keys = await listAllKeysUnderPrefix(destination, bucketName, prefix)
  let deletedCount = 0
  for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
    const batch = keys.slice(i, i + DELETE_BATCH_SIZE)
    await deleteObjects(destination, bucketName, batch)
    deletedCount += batch.length
  }
  return { deletedCount }
}

export async function renameFile(destination: S3Destination, bucketName: string, oldKey: string, newKey: string): Promise<void> {
  await copyObject(destination, bucketName, oldKey, newKey)
  await deleteObject(destination, bucketName, oldKey)
}

export async function renameFolder(destination: S3Destination, bucketName: string, oldPrefix: string, newPrefix: string): Promise<{ copiedCount: number }> {
  const keys = await listAllKeysUnderPrefix(destination, bucketName, oldPrefix)
  let copiedCount = 0
  for (const key of keys) {
    const relativePath = key.slice(oldPrefix.length)
    const newKey = newPrefix + relativePath
    await copyObject(destination, bucketName, key, newKey)
    copiedCount++
  }
  if (copiedCount > 0) {
    for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
      const batch = keys.slice(i, i + DELETE_BATCH_SIZE)
      await deleteObjects(destination, bucketName, batch)
    }
  }
  return { copiedCount }
}

/** Copy object from one bucket to another (same or different) */
export async function copyObjectCrossBucket(destination: S3Destination, sourceBucket: string, destBucket: string, sourceKey: string, destKey: string): Promise<void> {
  const client = getS3Client(destination)
  const command = new CopyObjectCommand({
    Bucket: destBucket,
    CopySource: encodeURI(`${sourceBucket}/${sourceKey}`),
    Key: destKey
  })
  await client.send(command)
}

export async function deleteBucket(destination: S3Destination, bucketName: string): Promise<void> {
  const client = getS3Client(destination)
  const command = new DeleteBucketCommand({
    Bucket: bucketName
  })
  await client.send(command)
}

/** Rename bucket: create new, copy all objects, delete old bucket. Returns new bucket name. */
export async function renameBucket(destination: S3Destination, oldBucketName: string, newBucketName: string): Promise<void> {
  const keys = await listAllKeysUnderPrefix(destination, oldBucketName, '')
  await createBucket(destination, newBucketName)
  for (const key of keys) {
    await copyObjectCrossBucket(destination, oldBucketName, newBucketName, key, key)
  }
  for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
    const batch = keys.slice(i, i + DELETE_BATCH_SIZE)
    await deleteObjects(destination, oldBucketName, batch)
  }
  await deleteBucket(destination, oldBucketName)
}
