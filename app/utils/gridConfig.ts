/**
 * Configuration for file grid (Grid View)
 */

export interface GridConfig {
  minWidth: string
  maxWidth: string
}

export const GRID_CONFIG: GridConfig = {
  minWidth: '8.5rem',
  maxWidth: '12.5rem'
}

/**
 * Get classes for the grid container
 */
export function getGridContainerClasses(): string {
  return 'grid gap-2'
}

/**
 * Get inline style for the grid container
 */
export function getGridContainerStyle(): Record<string, string> {
  const { minWidth, maxWidth } = GRID_CONFIG
  return {
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, ${maxWidth}))`
  }
}

/**
 * Get classes for grid item
 */
export function getGridItemClasses(): string {
  return 'w-full max-w-[12.5rem]'
}
