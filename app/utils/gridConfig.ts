/**
 * Configuration for file grid (Grid View)
 */

export interface GridConfig {
  columns: {
    default: string
    sm: string
    md: string
    lg: string
    xl: string
  }
}

export const GRID_CONFIG: GridConfig = {
  columns: {
    default: 'w-[calc(50%-0.25rem)]', // 2 columns on mobile
    sm: 'w-[calc(33.333%-0.5rem)]', // 3 columns on tablet
    md: 'w-[calc(25%-0.5rem)]', // 4 columns on desktop
    lg: 'w-[calc(20%-0.5rem)]', // 5 columns on large desktop
    xl: 'w-[calc(16.666%-0.5rem)]' // 6 columns on extra large
  }
}

/**
 * Get classes for grid item
 */
export function getGridItemClasses(): string {
  const { columns } = GRID_CONFIG
  return `${columns.default} sm:${columns.sm} md:${columns.md} lg:${columns.lg} xl:${columns.xl}`
}

/**
 * Number of columns for each breakpoint
 */
export const GRID_COLUMNS = {
  default: 2,
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6
} as const
