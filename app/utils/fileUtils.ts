import type { FileItem } from '../types'

/**
 * Get icon name for a file based on its extension
 */
export function getFileIcon(file: FileItem): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''

  const iconMap: Record<string, string> = {
    pdf: 'i-heroicons-document-text',
    doc: 'i-heroicons-document-text',
    docx: 'i-heroicons-document-text',
    xls: 'i-heroicons-table-cells',
    xlsx: 'i-heroicons-table-cells',
    jpg: 'i-heroicons-photo',
    jpeg: 'i-heroicons-photo',
    png: 'i-heroicons-photo',
    gif: 'i-heroicons-photo',
    mp4: 'i-heroicons-film',
    mp3: 'i-heroicons-musical-note',
    zip: 'i-heroicons-archive-box',
    rar: 'i-heroicons-archive-box'
  }

  return iconMap[ext] || 'i-heroicons-document'
}

/**
 * Format file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format date to short format (DD.MM.YYYY)
 */
export function formatDateShort(date: Date): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Check if file is an image
 */
export function isImage(file: FileItem | null): boolean {
  if (!file) return false
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
}

/**
 * Check if file is a PDF
 */
export function isPDF(file: FileItem | null): boolean {
  if (!file) return false
  return file.name.toLowerCase().endsWith('.pdf')
}

/**
 * Check if file is a text file
 */
export function isTextFile(file: FileItem | null): boolean {
  if (!file) return false
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const textExtensions = [
    'txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'htm', 'css', 'scss', 'sass',
    'less', 'xml', 'yaml', 'yml', 'ini', 'conf', 'config', 'log', 'sh', 'bash', 'zsh', 'fish',
    'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'dart',
    'sql', 'r', 'm', 'pl', 'pm', 'lua', 'vim', 'diff', 'patch', 'env', 'gitignore', 'gitattributes'
  ]
  return textExtensions.includes(ext)
}

/**
 * Check if file can be previewed (image, PDF, or text file)
 */
export function canPreview(file: FileItem): boolean {
  return isImage(file) || isPDF(file) || isTextFile(file)
}
