export function toISODateUTC(d = new Date()) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function safeString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

