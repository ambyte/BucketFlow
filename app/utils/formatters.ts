/** Format a date string to dd/mm/yyyy */
export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/** Format a date string to dd MMM yyyy, HH:mm */
export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
