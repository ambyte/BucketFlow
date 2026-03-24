/**
 * Centralized error handling
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'statusMessage' in error) {
    return String(error.statusMessage)
  }
  return 'An unknown error occurred'
}

export function useErrorHandler() {
  const toast = useToast()

  const handle = (error: unknown, context: string = 'Error') => {
    const message = getErrorMessage(error)
    console.error(`[${context}]:`, error)
    toast.add({
      title: context,
      description: message,
      color: 'error'
    })
  }

  const success = (message: string, title: string = 'Success') => {
    toast.add({
      title,
      description: message,
      color: 'success'
    })
  }

  const warning = (message: string, title: string = 'Warning') => {
    toast.add({
      title,
      description: message,
      color: 'warning'
    })
  }

  const info = (message: string, title: string = 'Info') => {
    toast.add({
      title,
      description: message,
      color: 'info'
    })
  }

  return {
    handle,
    success,
    warning,
    info
  }
}
