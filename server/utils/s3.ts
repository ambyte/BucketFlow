import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectVersionsCommand,
  type CreateBucketCommandInput,
  type HeadObjectCommandOutput,
  type ListObjectsV2CommandOutput,
  type ListObjectVersionsCommandOutput
} from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'
import { createError } from 'h3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  FileItem,
  FolderItem,
  ListObjectsResult,
  S3Destination
} from '../../app/types'

const METADATA_B64_PREFIX = 'b64:'
const DELETE_BATCH_SIZE = 1000
const AWS_DEFAULT_REGION = 'us-east-1'
/** Regions where CreateBucket must omit LocationConstraint (S3 spec + R2 `auto`). */
const SKIP_LOCATION_CONSTRAINT = new Set([
  'us-east-1',
  'auto',
  'default'
])

type S3LikeError = {
  name?: string
  message?: string
  Code?: string
  $metadata?: { httpStatusCode?: number }
  $response?: { statusCode?: number, headers?: unknown }
}

/** S3 x-amz-meta-* headers allow only US-ASCII. Encode non-ASCII values as Base64. */
export function encodeMetadataForS3(
  metadata: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(metadata)) {
    if (typeof v !== 'string') continue
    if (/[^\x00-\x7F]/.test(v)) {
      result[k]
        = METADATA_B64_PREFIX + Buffer.from(v, 'utf8').toString('base64')
    } else {
      result[k] = v
    }
  }
  return result
}

/** Decode metadata values that were Base64-encoded for S3 headers. */
export function decodeMetadataFromS3(
  metadata: Record<string, string> | undefined
): Record<string, string> {
  if (!metadata) return {}
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(metadata)) {
    if (typeof v !== 'string') continue
    if (v.startsWith(METADATA_B64_PREFIX)) {
      try {
        result[k] = Buffer.from(
          v.slice(METADATA_B64_PREFIX.length),
          'base64'
        ).toString('utf8')
      } catch {
        result[k] = v
      }
    } else {
      result[k] = v
    }
  }
  return result
}

export function getS3ErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' ? error : 'Unknown S3 error'
  }
  const e = error as S3LikeError & { statusMessage?: string }
  const code
    = (e.Code && e.Code !== 'Error' ? e.Code : undefined)
      || (e.name && e.name !== 'Error' ? e.name : undefined)
  let message = e.message || e.statusMessage || 'Unknown S3 error'

  if (
    message.includes('Deserialization error')
    || /char '.' is not expected/i.test(message)
  ) {
    const status = e.$metadata?.httpStatusCode || e.$response?.statusCode
    message = status
      ? `S3 returned a non-XML response (HTTP ${status}). Check the endpoint URL, path-style setting, and that the host speaks the S3 API.`
      : 'S3 returned a non-XML response. Check the endpoint URL, path-style setting, and that the host speaks the S3 API.'
  }

  if (code && !message.startsWith(code)) {
    return `${code}: ${message}`
  }
  return message
}

export function getS3HttpStatus(error: unknown, fallback = 400): number {
  if (!error || typeof error !== 'object') return fallback
  const e = error as S3LikeError & { statusCode?: number }
  if (typeof e.statusCode === 'number' && e.statusCode >= 400) {
    return e.statusCode
  }
  const status = e.$metadata?.httpStatusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return status
  }
  const name = e.Code || e.name
  if (name === 'BucketAlreadyExists' || name === 'BucketAlreadyOwnedByYou') {
    return 409
  }
  if (name === 'NoSuchBucket' || name === 'NoSuchKey' || name === 'NotFound') return 404
  if (name === 'AccessDenied' || name === 'Forbidden') return 403
  return fallback
}

function logS3Error(error: unknown): void {
  if (!error || typeof error !== 'object') {
    console.error('[S3]', error)
    return
  }
  const e = error as S3LikeError
  console.error('[S3]', {
    name: e.name,
    Code: e.Code,
    message: e.message,
    metadata: e.$metadata,
    responseStatus: e.$response?.statusCode,
    responseHeaders: e.$response?.headers
  })
}

/**
 * MinIO and some other S3-compatible APIs still require Content-MD5 on
 * DeleteObjects. AWS SDK v3.729+ stopped sending MD5 by default.
 * https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/MD5_FALLBACK.md
 */
function addDeleteObjectsMd5Middleware(client: S3Client): void {
  const md5Middleware = (
    next: (args: { request: { headers: Record<string, string>, body?: unknown } }) => Promise<unknown>,
    context: { commandName?: string }
  ) =>
    async (args: { request: { headers: Record<string, string>, body?: unknown } }) => {
      if (context.commandName !== 'DeleteObjectsCommand') {
        return next(args)
      }

      const headers = args.request.headers
      for (const header of Object.keys(headers)) {
        const lower = header.toLowerCase()
        if (
          lower.startsWith('x-amz-checksum-')
          || lower.startsWith('x-amz-sdk-checksum-')
        ) {
          delete headers[header]
        }
      }

      if (args.request.body) {
        // Lowercase: AWS SigV4 signs the canonical header set.
        headers['content-md5'] = createHash('md5')
          .update(Buffer.from(args.request.body as string | Uint8Array))
          .digest('base64')
      }

      return next(args)
    }

  // Must run in `build` (after serialize, before SigV4). Adding the header
  // in `finalizeRequest` leaves Content-MD5 unsigned and MinIO returns
  // AccessDenied: headers present which were not signed.
  client.middlewareStack.add(md5Middleware, {
    step: 'build',
    name: 'addMD5ChecksumForDeleteObjects',
    priority: 'low',
    tags: ['MD5_FALLBACK']
  })
}

function wrapS3Error(error: unknown): Error {
  if (error && typeof error === 'object' && 'statusCode' in error && 'statusMessage' in error) {
    return error as Error
  }
  const wrapped = new Error(getS3ErrorMessage(error))
  const src = error as S3LikeError
  wrapped.name = src?.name || 'S3Error'
  Object.assign(wrapped, {
    Code: src?.Code,
    $metadata: src?.$metadata,
    cause: error
  })
  return wrapped
}

async function send<T>(client: S3Client, command: unknown): Promise<T> {
  try {
    return (await client.send(command as never)) as T
  } catch (error) {
    logS3Error(error)
    throw wrapS3Error(error)
  }
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '')
}

function resolveRegion(destination: S3Destination): string {
  return destination.region?.trim() || AWS_DEFAULT_REGION
}

/** Encode bucket/key for x-amz-copy-source per the S3 API. */
export function encodeCopySource(bucket: string, key: string): string {
  const encodedKey = key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
  return `${encodeURIComponent(bucket)}/${encodedKey}`
}

export function normalizeFolderKey(key: string): string {
  return key.replace(/^\/+/, '').replace(/\/+$/, '') + '/'
}

/** Cache S3 clients by destination ID to avoid race conditions with concurrent requests */
const clientCache = new Map<string, { client: S3Client, configHash: string }>()

function buildConfigHash(
  endpoint: string,
  destination: S3Destination,
  region: string,
  forcePathStyle: boolean
): string {
  return `${endpoint}|${destination.accessKeyId}|${destination.secretAccessKey}|${region}|${forcePathStyle}`
}

export function getS3Client(destination: S3Destination): S3Client {
  if (!destination) {
    throw new Error('S3Destination is required')
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

  const region = resolveRegion(destination)
  const endpoint = normalizeEndpoint(destination.endpoint)
  const forcePathStyle = destination.forcePathStyle ?? true
  const configHash = buildConfigHash(endpoint, destination, region, forcePathStyle)
  const cacheKey = destination.id

  if (cacheKey) {
    const cached = clientCache.get(cacheKey)
    if (cached && cached.configHash === configHash) {
      return cached.client
    }
  }

  const client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: destination.accessKeyId,
      secretAccessKey: destination.secretAccessKey
    },
    forcePathStyle,
    // AWS SDK v3.729+ sends CRC32 on every request by default; many
    // S3-compatible servers return HTML/non-XML errors for those headers.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  })
  addDeleteObjectsMd5Middleware(client)

  if (cacheKey) {
    clientCache.set(cacheKey, { client, configHash })
  }
  return client
}

export async function testS3Connection(
  destination: S3Destination
): Promise<{ success: boolean, message: string, buckets?: string[] }> {
  try {
    const client = getS3Client(destination)
    const response = await send<{ Buckets?: { Name?: string }[] }>(
      client,
      new ListBucketsCommand({})
    )

    const buckets = response.Buckets?.map(b => b.Name || '') || []

    return {
      success: true,
      message: 'Connection successful',
      buckets
    }
  } catch (error) {
    return {
      success: false,
      message: getS3ErrorMessage(error)
    }
  }
}

export async function listBuckets(
  destination: S3Destination,
  bucketNames?: string[]
): Promise<string[]> {
  const client = getS3Client(destination)
  const response = await send<{ Buckets?: { Name?: string }[] }>(
    client,
    new ListBucketsCommand({})
  )
  const allBuckets
    = response.Buckets?.map(b => b.Name || '').filter(Boolean) || []

  if (!bucketNames || bucketNames.length === 0) {
    return allBuckets
  }

  return allBuckets.filter(bucket => bucketNames.includes(bucket))
}

export async function ensureBucketExists(
  destination: S3Destination,
  bucketName: string
): Promise<void> {
  const client = getS3Client(destination)
  try {
    await send(client, new HeadBucketCommand({ Bucket: bucketName }))
  } catch (err: unknown) {
    const name
      = err && typeof err === 'object' && 'name' in err
        ? String((err as { name: string }).name)
        : ''
    const status = getS3HttpStatus(err, 0)
    if (name === 'NoSuchBucket' || name === 'NotFound' || status === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Bucket not found'
      })
    }
    throw err
  }
}

export async function hasPrefixContent(
  destination: S3Destination,
  bucketName: string,
  prefix: string
): Promise<boolean> {
  const client = getS3Client(destination)
  const response = await send<ListObjectsV2CommandOutput>(
    client,
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: '/',
      MaxKeys: 1
    })
  )
  const contents = response.Contents?.length ?? 0
  const prefixes = response.CommonPrefixes?.length ?? 0
  return contents > 0 || prefixes > 0
}

async function listObjectsPageAll(
  client: S3Client,
  bucketName: string,
  prefix: string
): Promise<{
  contents: NonNullable<ListObjectsV2CommandOutput['Contents']>
  commonPrefixes: NonNullable<ListObjectsV2CommandOutput['CommonPrefixes']>
}> {
  const contents: NonNullable<ListObjectsV2CommandOutput['Contents']> = []
  const commonPrefixes: NonNullable<
    ListObjectsV2CommandOutput['CommonPrefixes']
  > = []
  let continuationToken: string | undefined

  do {
    const response = await send<ListObjectsV2CommandOutput>(
      client,
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/',
        ContinuationToken: continuationToken
      })
    )
    if (response.Contents?.length) contents.push(...response.Contents)
    if (response.CommonPrefixes?.length) {
      commonPrefixes.push(...response.CommonPrefixes)
    }
    if (!response.IsTruncated || !response.NextContinuationToken) break
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return { contents, commonPrefixes }
}

export async function listObjects(
  destination: S3Destination,
  bucketName: string,
  prefix: string = ''
): Promise<ListObjectsResult> {
  const client = getS3Client(destination)
  const { contents, commonPrefixes } = await listObjectsPageAll(
    client,
    bucketName,
    prefix
  )

  const metadataColumns
    = destination.metadataColumns?.filter(k => k?.trim()) || []

  const folderMap = new Map<string, FolderItem>()
  for (const commonPrefix of commonPrefixes) {
    const folderPrefix = commonPrefix.Prefix || ''
    if (!folderPrefix || folderPrefix === prefix) continue
    const name = folderPrefix.replace(prefix, '').replace(/\/$/, '')
    if (!name || name.includes('/')) continue
    folderMap.set(folderPrefix, { Prefix: folderPrefix, name })
  }

  const fileObjects = contents.filter((obj) => {
    const key = obj.Key || ''
    if (!key || key === prefix) return false
    if (key.endsWith('/')) {
      const name = key.replace(prefix, '').replace(/\/$/, '')
      if (name && !name.includes('/') && !folderMap.has(key)) {
        folderMap.set(key, { Prefix: key, name })
      }
      return false
    }
    return true
  })

  const files: FileItem[] = await Promise.all(
    fileObjects.map(async (obj) => {
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
          file.Metadata = decodeMetadataFromS3(
            head.Metadata as Record<string, string>
          )
        } catch {
          file.Metadata = {}
        }
      }
      return file
    })
  )

  const folders = [...folderMap.values()]

  return {
    files,
    folders,
    commonPrefixes: folders.map(f => f.Prefix),
    metadataColumns: metadataColumns.length > 0 ? metadataColumns : undefined
  }
}

export async function getPresignedDownloadUrl(
  destination: S3Destination,
  bucketName: string,
  key: string,
  expiresIn: number = 3600,
  downloadFilename?: string
): Promise<string> {
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

export async function getPresignedUploadUrl(
  destination: S3Destination,
  bucketName: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client(destination)
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType
  })

  return getSignedUrl(client, command, { expiresIn })
}

export async function uploadFile(
  destination: S3Destination,
  bucketName: string,
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const client = getS3Client(destination)
  await send(
    client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  )
}

/** Create a zero-byte folder marker object (`key/` + Content-Length 0). */
export async function createFolder(
  destination: S3Destination,
  bucketName: string,
  key: string
): Promise<void> {
  const folderKey = normalizeFolderKey(key)
  const client = getS3Client(destination)
  await send(
    client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: folderKey,
      Body: new Uint8Array(0),
      ContentLength: 0,
      ContentType: 'application/x-directory'
    })
  )
}

export async function createBucket(
  destination: S3Destination,
  bucketName: string
): Promise<void> {
  const client = getS3Client(destination)
  const region = resolveRegion(destination)
  const input: CreateBucketCommandInput = {
    Bucket: bucketName
  }
  if (!SKIP_LOCATION_CONSTRAINT.has(region.toLowerCase())) {
    input.CreateBucketConfiguration = {
      LocationConstraint: region as NonNullable<
        CreateBucketCommandInput['CreateBucketConfiguration']
      >['LocationConstraint']
    }
  }
  await send(client, new CreateBucketCommand(input))
}

export async function deleteObject(
  destination: S3Destination,
  bucketName: string,
  key: string
): Promise<void> {
  const client = getS3Client(destination)
  await send(
    client,
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    })
  )
}

type ObjectToDelete = { Key: string, VersionId?: string }

export async function deleteObjects(
  destination: S3Destination,
  bucketName: string,
  keys: Array<string | ObjectToDelete>
): Promise<void> {
  if (keys.length === 0) return
  const client = getS3Client(destination)
  const objects: ObjectToDelete[] = keys.map(key =>
    typeof key === 'string'
      ? { Key: key }
      : key.VersionId
        ? { Key: key.Key, VersionId: key.VersionId }
        : { Key: key.Key }
  )
  const response = await send<{
    Errors?: { Key?: string, Code?: string, Message?: string }[]
  }>(
    client,
    new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objects
      }
    })
  )

  if (response.Errors?.length) {
    const failed = response.Errors.map(
      e => `${e.Key || '?'}: ${e.Code || 'Error'} ${e.Message || ''}`.trim()
    ).join('; ')
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete some objects: ${failed}`
    })
  }
}

export async function getObjectMetadata(
  destination: S3Destination,
  bucketName: string,
  key: string
) {
  const client = getS3Client(destination)
  return await send<HeadObjectCommandOutput>(
    client,
    new HeadObjectCommand({
      Bucket: bucketName,
      Key: key
    })
  )
}

/** List all object keys under a prefix recursively (no delimiter) */
export async function listAllKeysUnderPrefix(
  destination: S3Destination,
  bucketName: string,
  prefix: string
): Promise<string[]> {
  const client = getS3Client(destination)
  const keys: string[] = []
  let continuationToken: string | undefined
  do {
    const response = await send<ListObjectsV2CommandOutput>(
      client,
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    )
    for (const obj of response.Contents || []) {
      if (obj.Key) keys.push(obj.Key)
    }
    if (!response.IsTruncated || !response.NextContinuationToken) break
    continuationToken = response.NextContinuationToken
  } while (continuationToken)
  return keys
}

/**
 * Keys to remove when deleting a folder. MinIO (and some other S3 APIs)
 * omit zero-byte directory objects (`prefix/`) from ListObjectsV2 Contents,
 * so we always include the folder prefix and nested CommonPrefixes.
 */
async function collectDeletableKeysUnderPrefix(
  destination: S3Destination,
  bucketName: string,
  prefix: string
): Promise<string[]> {
  const folderPrefix = normalizeFolderKey(prefix)
  const keys = new Set<string>([folderPrefix])
  const client = getS3Client(destination)

  for (const key of await listAllKeysUnderPrefix(
    destination,
    bucketName,
    folderPrefix
  )) {
    keys.add(key)
  }

  const stack = [folderPrefix]
  const visited = new Set<string>()
  while (stack.length) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)

    let continuationToken: string | undefined
    do {
      const response = await send<ListObjectsV2CommandOutput>(
        client,
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: current,
          Delimiter: '/',
          ContinuationToken: continuationToken
        })
      )
      for (const obj of response.Contents || []) {
        if (obj.Key) keys.add(obj.Key)
      }
      for (const cp of response.CommonPrefixes || []) {
        if (!cp.Prefix) continue
        keys.add(cp.Prefix)
        stack.push(cp.Prefix)
      }
      if (!response.IsTruncated || !response.NextContinuationToken) break
      continuationToken = response.NextContinuationToken
    } while (continuationToken)
  }

  return [...keys]
}

async function listObjectVersionsUnderPrefix(
  destination: S3Destination,
  bucketName: string,
  prefix: string
): Promise<ObjectToDelete[]> {
  const client = getS3Client(destination)
  const items: ObjectToDelete[] = []
  let keyMarker: string | undefined
  let versionIdMarker: string | undefined
  do {
    const response = await send<ListObjectVersionsCommandOutput>(
      client,
      new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: prefix,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker
      })
    )
    for (const version of response.Versions || []) {
      if (version.Key) {
        items.push(
          version.VersionId
            ? { Key: version.Key, VersionId: version.VersionId }
            : { Key: version.Key }
        )
      }
    }
    for (const marker of response.DeleteMarkers || []) {
      if (marker.Key) {
        items.push(
          marker.VersionId
            ? { Key: marker.Key, VersionId: marker.VersionId }
            : { Key: marker.Key }
        )
      }
    }
    if (!response.IsTruncated) break
    keyMarker = response.NextKeyMarker
    versionIdMarker = response.NextVersionIdMarker
  } while (keyMarker)
  return items
}

async function folderPrefixStillVisible(
  destination: S3Destination,
  bucketName: string,
  folderPrefix: string
): Promise<boolean> {
  const client = getS3Client(destination)
  const parent = folderPrefix.replace(/[^/]+\/$/, '')
  const { contents, commonPrefixes } = await listObjectsPageAll(
    client,
    bucketName,
    parent
  )
  if (commonPrefixes.some(cp => cp.Prefix === folderPrefix)) return true
  if (contents.some(obj =>
    obj.Key === folderPrefix || (obj.Key?.startsWith(folderPrefix) ?? false)
  )) {
    return true
  }
  try {
    await getObjectMetadata(destination, bucketName, folderPrefix)
    return true
  } catch (error) {
    return getS3HttpStatus(error, 0) !== 404
  }
}

function isVersionsListingUnsupported(error: unknown): boolean {
  const status = getS3HttpStatus(error, 0)
  if (status === 404 || status === 405 || status === 501) return true
  const e = error as S3LikeError
  const name = e.Code || e.name || ''
  return (
    name === 'NotImplemented'
    || name === 'InvalidRequest'
    || name === 'MethodNotAllowed'
    || name === 'NoSuchBucket'
  )
}

export async function copyObject(
  destination: S3Destination,
  bucketName: string,
  sourceKey: string,
  destKey: string
): Promise<void> {
  const client = getS3Client(destination)
  await send(
    client,
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: encodeCopySource(bucketName, sourceKey),
      Key: destKey
    })
  )
}

/** Copy object to itself with new user metadata (updates metadata without re-uploading content) */
export async function copyObjectWithMetadata(
  destination: S3Destination,
  bucketName: string,
  key: string,
  metadata: Record<string, string>
): Promise<void> {
  const client = getS3Client(destination)
  const head = await getObjectMetadata(destination, bucketName, key)
  const encoded = encodeMetadataForS3(metadata)
  await send(
    client,
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: encodeCopySource(bucketName, key),
      Key: key,
      Metadata: encoded,
      MetadataDirective: 'REPLACE',
      ...(head.ContentType ? { ContentType: head.ContentType } : {}),
      ...(head.CacheControl ? { CacheControl: head.CacheControl } : {}),
      ...(head.ContentDisposition
        ? { ContentDisposition: head.ContentDisposition }
        : {}),
      ...(head.ContentEncoding ? { ContentEncoding: head.ContentEncoding } : {}),
      ...(head.ContentLanguage ? { ContentLanguage: head.ContentLanguage } : {}),
      ...(head.Expires instanceof Date ? { Expires: head.Expires } : {}),
      ...(head.StorageClass ? { StorageClass: head.StorageClass } : {}),
      ...(head.WebsiteRedirectLocation
        ? { WebsiteRedirectLocation: head.WebsiteRedirectLocation }
        : {})
    })
  )
}

export async function deleteFolder(
  destination: S3Destination,
  bucketName: string,
  prefix: string
): Promise<{ deletedCount: number }> {
  const folderPrefix = normalizeFolderKey(prefix)
  let deletedCount = 0

  for (let attempt = 0; attempt < 5; attempt++) {
    const keys = await collectDeletableKeysUnderPrefix(
      destination,
      bucketName,
      folderPrefix
    )
    const files = keys.filter(key => !key.endsWith('/'))
    // Deepest directory placeholders first. Send them in their own
    // DeleteObjects call so the trailing slash stays in the XML body
    // (DeleteObject puts the key in the URL and some servers strip it).
    const dirs = keys
      .filter(key => key.endsWith('/'))
      .sort((a, b) => b.length - a.length)

    if (files.length === 0 && dirs.length === 0) break

    for (let i = 0; i < files.length; i += DELETE_BATCH_SIZE) {
      const batch = files.slice(i, i + DELETE_BATCH_SIZE)
      await deleteObjects(destination, bucketName, batch)
      deletedCount += batch.length
    }
    for (let i = 0; i < dirs.length; i += DELETE_BATCH_SIZE) {
      const batch = dirs.slice(i, i + DELETE_BATCH_SIZE)
      await deleteObjects(destination, bucketName, batch)
      deletedCount += batch.length
    }
    for (const dir of dirs) {
      try {
        await deleteObject(destination, bucketName, dir)
      } catch (error) {
        if (getS3HttpStatus(error, 0) !== 404) throw error
      }
    }

    const leftover = await listAllKeysUnderPrefix(
      destination,
      bucketName,
      folderPrefix
    )
    if (leftover.length === 0 && !(await folderPrefixStillVisible(
      destination,
      bucketName,
      folderPrefix
    ))) {
      break
    }
  }

  try {
    const versions = await listObjectVersionsUnderPrefix(
      destination,
      bucketName,
      folderPrefix
    )
    for (let i = 0; i < versions.length; i += DELETE_BATCH_SIZE) {
      const batch = versions.slice(i, i + DELETE_BATCH_SIZE)
      await deleteObjects(destination, bucketName, batch)
      deletedCount += batch.length
    }
  } catch (error) {
    if (!isVersionsListingUnsupported(error)) throw error
  }

  // MinIO filesystem backend can keep an empty prefix visible after every
  // object is gone. Recreating the placeholder and deleting it drops the dir.
  if (await folderPrefixStillVisible(destination, bucketName, folderPrefix)) {
    await createFolder(destination, bucketName, folderPrefix)
    try {
      await deleteObject(destination, bucketName, folderPrefix)
    } catch (error) {
      if (getS3HttpStatus(error, 0) !== 404) throw error
    }
    await deleteObjects(destination, bucketName, [folderPrefix])
  }

  return { deletedCount }
}

export async function renameFile(
  destination: S3Destination,
  bucketName: string,
  oldKey: string,
  newKey: string
): Promise<void> {
  await copyObject(destination, bucketName, oldKey, newKey)
  await deleteObject(destination, bucketName, oldKey)
}

export async function renameFolder(
  destination: S3Destination,
  bucketName: string,
  oldPrefix: string,
  newPrefix: string
): Promise<{ copiedCount: number }> {
  const fromPrefix = normalizeFolderKey(oldPrefix)
  const toPrefix = normalizeFolderKey(newPrefix)
  const keys = await collectDeletableKeysUnderPrefix(
    destination,
    bucketName,
    fromPrefix
  )
  let copiedCount = 0
  for (const key of keys) {
    const relativePath = key.slice(fromPrefix.length)
    const newKey = toPrefix + relativePath
    try {
      await copyObject(destination, bucketName, key, newKey)
      copiedCount++
    } catch (error) {
      // CommonPrefixes / directory keys may not be real objects on MinIO.
      if (key.endsWith('/') && getS3HttpStatus(error, 0) === 404) continue
      throw error
    }
  }
  for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
    const batch = keys.slice(i, i + DELETE_BATCH_SIZE)
    await deleteObjects(destination, bucketName, batch)
  }
  return { copiedCount }
}

/** Copy object from one bucket to another (same or different) */
export async function copyObjectCrossBucket(
  destination: S3Destination,
  sourceBucket: string,
  destBucket: string,
  sourceKey: string,
  destKey: string
): Promise<void> {
  const client = getS3Client(destination)
  await send(
    client,
    new CopyObjectCommand({
      Bucket: destBucket,
      CopySource: encodeCopySource(sourceBucket, sourceKey),
      Key: destKey
    })
  )
}

export async function deleteBucket(
  destination: S3Destination,
  bucketName: string
): Promise<void> {
  const client = getS3Client(destination)
  await send(
    client,
    new DeleteBucketCommand({
      Bucket: bucketName
    })
  )
}

/** Rename bucket: create new, copy all objects, delete old bucket. Returns new bucket name. */
export async function renameBucket(
  destination: S3Destination,
  oldBucketName: string,
  newBucketName: string
): Promise<void> {
  const keys = await listAllKeysUnderPrefix(destination, oldBucketName, '')
  await createBucket(destination, newBucketName)
  for (const key of keys) {
    await copyObjectCrossBucket(
      destination,
      oldBucketName,
      newBucketName,
      key,
      key
    )
  }
  for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
    const batch = keys.slice(i, i + DELETE_BATCH_SIZE)
    await deleteObjects(destination, oldBucketName, batch)
  }
  await deleteBucket(destination, oldBucketName)
}
