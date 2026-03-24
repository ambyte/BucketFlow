export const themeColors = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose'
]

export const neutralColors = ['slate', 'gray', 'zinc', 'neutral', 'stone']

export const themeColorItems = themeColors.map(c => ({
  label: c.charAt(0).toUpperCase() + c.slice(1),
  value: c
}))

export const neutralColorItems = neutralColors.map(c => ({
  label: c.charAt(0).toUpperCase() + c.slice(1),
  value: c
}))

export const themeModeItems = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' }
]

export function isValidColor(color: string): boolean {
  return themeColors.includes(color)
}

export function isValidNeutral(color: string): boolean {
  return neutralColors.includes(color)
}
