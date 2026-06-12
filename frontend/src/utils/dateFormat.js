// DD/MM/YYYY display helpers

export function toDisplay(isoDate) {
  if (!isoDate) return ''
  // Handle YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const d = isoDate.split('T')[0]
  const parts = d.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// Convert DD/MM/YYYY → YYYY-MM-DD for storage/input[type=date]
export function toISO(displayDate) {
  if (!displayDate) return ''
  const parts = displayDate.split('/')
  if (parts.length !== 3) return displayDate
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

// Format for <input type="date"> (expects YYYY-MM-DD)
export function forInput(isoDate) {
  if (!isoDate) return ''
  return isoDate.split('T')[0]
}
