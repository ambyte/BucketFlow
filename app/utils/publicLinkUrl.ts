export type PublicViewMode = 'embed' | 'page'

export function isPublicViewMode(value: unknown): value is PublicViewMode {
  return value === 'embed' || value === 'page'
}

export function buildPublicPageUrl(options: {
  origin: string
  hash: string
  primary?: string
  neutral?: string
  theme?: string
  view?: PublicViewMode
}): string {
  if (!options.hash) return ''
  const url = new URL(`${options.origin}/public`)
  url.searchParams.set('path', options.hash)
  if (options.primary) url.searchParams.set('primary', options.primary)
  if (options.neutral) url.searchParams.set('neutral', options.neutral)
  if (options.theme) url.searchParams.set('theme', options.theme)
  if (options.view === 'page') url.searchParams.set('view', 'page')
  return url.toString()
}

export function buildPublicIframeCode(src: string): string {
  return `<iframe src="${src}" width="100%" height="600" frameborder="0"></iframe>`
}

export function sharedLocationLabel(bucket?: string, path?: string): string {
  const segments = (path || '')
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
  return segments[segments.length - 1] || bucket || 'Shared files'
}
