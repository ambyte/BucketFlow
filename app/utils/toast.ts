/** Show an error toast notification */
export function showToastError(title: string, error?: unknown) {
  const description
    = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (error as any)?.data?.statusMessage
        || (error as any)?.message
        || 'Unknown error'

  useToast().add({
    title,
    description,
    color: 'error'
  })
}

/** Show a success toast notification */
export function showToastSuccess(title: string, description?: string) {
  useToast().add({
    title,
    description,
    color: 'success'
  })
}
