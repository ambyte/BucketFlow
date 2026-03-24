import { GetObjectCommand } from '@aws-sdk/client-s3'
import archiver from 'archiver'
import type { Readable } from 'node:stream'
import { createError, sendStream, setHeader, type H3Event } from 'h3'
import { getS3Client, listAllKeysUnderPrefix } from './s3'
import type { S3Destination } from '../../app/types'

const MAX_KEYS = 10_000

export function zipEntryName(key: string, basePath: string): string {
  const base = basePath || ''
  if (base && key.startsWith(base)) {
    const rel = key.slice(base.length).replace(/^\//, '')
    if (rel && !rel.endsWith('/')) return rel
  }
  const parts = key.split('/').filter(Boolean)
  return parts.length ? parts.join('/') : key
}

/** Map S3 keys to unique ZIP entry paths (handles duplicate basenames). */
export function buildEntryNamesMap(
  keys: string[],
  basePath: string
): Map<string, string> {
  const map = new Map<string, string>()
  const stemCounts = new Map<string, number>()
  for (const key of keys) {
    let stem = zipEntryName(key, basePath)
    if (!stem || stem.endsWith('/')) {
      stem = key.split('/').filter(Boolean).pop() || 'file'
    }
    const n = stemCounts.get(stem) ?? 0
    stemCounts.set(stem, n + 1)
    let entryName = stem
    if (n > 0) {
      const dot = stem.lastIndexOf('.')
      if (dot > 0) {
        entryName = `${stem.slice(0, dot)} (${n})${stem.slice(dot)}`
      } else {
        entryName = `${stem} (${n})`
      }
    }
    map.set(key, entryName)
  }
  return map
}

/** Expands explicit keys plus every object under each folder prefix (full tree depth). */
export async function collectZipKeys(
  destination: S3Destination,
  bucketName: string,
  keys: string[],
  prefixes: string[]
): Promise<string[]> {
  const set = new Set<string>()
  for (const k of keys) {
    if (typeof k === 'string' && k.length > 0) set.add(k)
  }
  for (const prefix of prefixes) {
    if (typeof prefix !== 'string' || prefix.length === 0) continue
    // Recursive listing: all keys under prefix, including nested “folders”
    const under = await listAllKeysUnderPrefix(destination, bucketName, prefix)
    for (const key of under) {
      set.add(key)
    }
  }
  const list = [...set].filter(k => !k.endsWith('/'))
  if (list.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No files to download'
    })
  }
  if (list.length > MAX_KEYS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many files (max ${MAX_KEYS})`
    })
  }
  return list
}

const ZIP_MAX_LEN = 200

/**
 * Safe archive basename: keep Unicode letters/numbers/spaces; strip path chars and controls.
 */
function safeZipFilename(name: string): string {
  let base = name.trim()
  base = [...base]
    .filter((ch) => {
      const code = ch.codePointAt(0)!
      return code >= 0x20 && code !== 0x7f
    })
    .join('')
  base = base.replace(/[/\\:*?"<>|]/g, '-')
  base = base.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  if (!base) base = 'download'
  if (!/\.zip$/i.test(base)) base = `${base}.zip`
  if (base.length > ZIP_MAX_LEN) {
    const stem = base.slice(0, -4)
    base = `${[...stem].slice(0, ZIP_MAX_LEN - 4).join('')}.zip`
  }
  return base
}

/** ASCII-only fallback for Content-Disposition `filename=` (RFC 2183). */
function asciiFilenameFallback(filename: string): string {
  const s = filename.replace(/[^\x20-\x7e]/g, '_')
  return s.length ? s : 'download.zip'
}

export async function streamZipResponse(
  event: H3Event,
  destination: S3Destination,
  bucketName: string,
  keyToEntry: Map<string, string>,
  zipFilename: string
) {
  const client = getS3Client(destination)
  const archive = archiver('zip', { zlib: { level: 5 } })
  const filename = safeZipFilename(zipFilename)
  const asciiName = asciiFilenameFallback(filename).replace(/"/g, '\\"')

  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  )

  archive.on('error', () => {
    console.error('Error streaming ZIP archive', bucketName, filename)
    // Stream errors are handled by sendStream / client disconnect
  })

  const pump = async () => {
    try {
      for (const [key, entryName] of keyToEntry) {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key
          })
        )
        if (!response.Body) continue
        archive.append(response.Body as Readable, { name: entryName })
      }
      await archive.finalize()
    } catch {
      archive.abort()
    }
  }

  void pump()

  return sendStream(event, archive)
}
