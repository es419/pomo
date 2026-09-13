export function secondsBetween(startIso: string, end = Date.now()) {
  const start = new Date(startIso).getTime()
  return Math.max(0, Math.floor((end - start) / 1000))
}

export function formatDuration(totalSeconds: number, showSeconds = true) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  if (!showSeconds) {
    if (hours > 0) return `${hours} ש׳ ${minutes} דק׳`
    return `${minutes} דק׳`
  }
  const hh = hours > 0 ? `${String(hours).padStart(2, '0')}:` : ''
  return `${hh}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function localDateKey(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const diff = (d.getDay() + 6) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diff)
  return d
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
