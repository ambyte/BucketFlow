let _jwtSecret: string | null = null
let _encryptionKey: string | null = null

export function setJwtSecret(secret: string): void {
  _jwtSecret = secret
}

export function getJwtSecret(): string {
  if (!_jwtSecret) {
    throw new Error('JWT secret not initialized - ensure init-secrets plugin has run')
  }
  return _jwtSecret
}

export function setEncryptionKey(key: string): void {
  _encryptionKey = key
}

export function getEncryptionKey(): string {
  if (!_encryptionKey) {
    throw new Error('Encryption key not initialized - ensure init-secrets plugin has run')
  }
  return _encryptionKey
}
