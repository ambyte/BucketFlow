let _jwtSecret: string | null = null

export function setJwtSecret(secret: string): void {
  _jwtSecret = secret
}

export function getJwtSecret(): string {
  if (!_jwtSecret) {
    throw new Error('JWT secret not initialized - ensure init-secrets plugin has run')
  }
  return _jwtSecret
}
