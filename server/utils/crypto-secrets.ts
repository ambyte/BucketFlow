import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { getEncryptionKey } from './runtime-secrets'

const PREFIX = 'enc:v1:'

function keyBuffer(): Buffer {
  const hex = getEncryptionKey()
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex chars)')
  }
  return key
}

/** Encrypt a secret for at-rest storage (AES-256-GCM). */
export function encryptSecret(plain: string): string {
  if (!plain) return plain
  if (plain.startsWith(PREFIX)) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBuffer(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

/** Decrypt a secret; plaintext (legacy) values pass through. */
export function decryptSecret(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64url')
  if (raw.length < 13) {
    throw new Error('Invalid encrypted secret')
  }
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', keyBuffer(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
