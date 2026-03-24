/**
 * Composable for handling single and double clicks
 */

export function useDoubleClick<T = void>(
  onSingleClick: (item?: T) => void,
  onDoubleClick: (item?: T) => void,
  delay = 300
) {
  let clicks = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingItem: T | undefined

  const handleClick = (item?: T) => {
    clicks++
    pendingItem = item

    if (clicks === 1) {
      timer = setTimeout(() => {
        onSingleClick(pendingItem)
        clicks = 0
        timer = null
        pendingItem = undefined
      }, delay)
    } else {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      onDoubleClick(pendingItem)
      clicks = 0
      pendingItem = undefined
    }
  }

  return {
    handleClick
  }
}
