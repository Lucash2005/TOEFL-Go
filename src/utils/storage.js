export const TOEFL_PREFIX = 'toefl-go:'
export const N4_PREFIX = 'n4-go:'

export function loadJSON(key, fallback, prefix = TOEFL_PREFIX) {
  try {
    const raw = localStorage.getItem(prefix + key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveJSON(key, value, prefix = TOEFL_PREFIX) {
  localStorage.setItem(prefix + key, JSON.stringify(value))
}

export function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
