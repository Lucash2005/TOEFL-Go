import { todayKey } from './storage.js'

const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function normalizeEntry(raw, today = todayKey()) {
  if (!raw) return null
  if (typeof raw !== 'object') return null
  return {
    status: raw.status || 'learning',
    ease: typeof raw.ease === 'number' ? raw.ease : DEFAULT_EASE,
    interval: typeof raw.interval === 'number' ? raw.interval : 0,
    repetitions: typeof raw.repetitions === 'number' ? raw.repetitions : 0,
    due: raw.due || today,
    lapses: typeof raw.lapses === 'number' ? raw.lapses : 0,
    lastGrade: raw.lastGrade ?? null,
    // Do not invent learnedAt=today — that would inflate「近 7 日」統計
    learnedAt: raw.learnedAt || null,
  }
}

export function applyGrade(raw, grade, today = todayKey()) {
  const prev = normalizeEntry(raw, today) || {
    status: 'learning',
    ease: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    due: today,
    lapses: 0,
    lastGrade: null,
    learnedAt: null,
  }

  let { ease, interval, repetitions, lapses, status } = prev

  if (grade === 'again') {
    return {
      status: 'review',
      ease: Math.round(Math.max(MIN_EASE, ease - 0.2) * 100) / 100,
      interval: 0,
      repetitions: 0,
      due: today,
      lapses: lapses + 1,
      lastGrade: grade,
      learnedAt: null,
    }
  }

  if (grade === 'hard') {
    ease = Math.max(MIN_EASE, ease - 0.15)
    interval = repetitions === 0 ? 1 : repetitions === 1 ? 2 : Math.max(1, Math.round(interval * 1.2))
    repetitions += 1
  } else if (grade === 'good') {
    interval = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.max(1, Math.round(interval * ease))
    repetitions += 1
  } else if (grade === 'easy') {
    ease += 0.15
    interval = repetitions === 0 ? 2 : repetitions === 1 ? 4 : Math.max(1, Math.round(interval * ease * 1.3))
    repetitions += 1
  }

  status = interval >= 7 ? 'learned' : 'learning'
  const becameLearned = status === 'learned' && prev.status !== 'learned'
  return {
    status,
    ease: Math.round(ease * 100) / 100,
    interval,
    repetitions,
    due: addDays(today, interval),
    lapses,
    lastGrade: grade,
    learnedAt: status === 'learned' ? prev.learnedAt || (becameLearned ? today : null) : null,
  }
}

export function getDueIds(cardProgress = {}, allIds = [], limit = 20, today = todayKey()) {
  const due = allIds
    .map((id) => ({ id, entry: normalizeEntry(cardProgress[id], today) }))
    .filter(({ entry }) => entry && entry.due <= today)
    .sort((a, b) => (a.entry.due < b.entry.due ? -1 : 1))
    .map(({ id }) => id)
  return limit > 0 ? due.slice(0, limit) : due
}

export function isLearned(entry, today = todayKey()) {
  const n = normalizeEntry(entry, today)
  // Keep counting as mastered even when due for review — otherwise the
  // progress bar drops every time SRS brings a card back.
  return Boolean(n && n.status === 'learned')
}

/** Count cards whose learnedAt is on/after `sinceDate` (YYYY-MM-DD). */
export function countLearnedSince(cardProgress, ids, sinceDate, today = todayKey()) {
  let n = 0
  for (const id of ids) {
    const e = normalizeEntry(cardProgress[id], today)
    if (!e || e.status !== 'learned' || !e.learnedAt) continue
    if (e.learnedAt >= sinceDate) n += 1
  }
  return n
}

/** Filter-friendly bucket: new | review | learned */
export function getFilterStatus(cardProgress, id, today = todayKey()) {
  const entry = normalizeEntry(cardProgress?.[id], today)
  if (!entry) return 'new'
  if (entry.due <= today) return 'review'
  if (entry.status === 'learned') return 'learned'
  return 'review'
}

export const GRADE_LABELS = {
  again: { label: '忘記', hint: '今天再看' },
  hard: { label: '困難', hint: '縮短間隔' },
  good: { label: '記得', hint: '正常間隔' },
  easy: { label: '簡單', hint: '拉長間隔' },
}
