/**
 * S3 metadata key validation
 * - Only lowercase letters, digits, dash, underscore
 * - Length 1-64 characters
 */
export function isValidMetadataKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  return /^[a-z0-9_-]{1,64}$/.test(key)
}

/**
 * Username validation
 * - Minimum 3 characters
 * - Only letters, digits, dash, underscore
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false
  return /^[a-zA-Z0-9_-]{3,}$/.test(username)
}

/**
 * Password validation
 * - Minimum 6 characters
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false
  return password.length >= 6
}

/**
 * S3 bucket name validation
 * - 3-63 characters
 * - Only lowercase letters, digits, dash, dots
 * - Must start and end with letter or digit
 */
export function isValidS3BucketName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  if (name.length < 3 || name.length > 63) return false
  return /^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/.test(name)
}

/**
 * String sanitization from XSS
 * Removes potentially dangerous HTML characters
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Email validation (basic)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * URL endpoint validation
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
