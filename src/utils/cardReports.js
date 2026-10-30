import { CONTENT_VERSION } from '../data/config'
import { loadJSON, saveJSON } from './storage'

const STORAGE_KEY = 'reported-cards'

export const REPORT_REASONS = [
  { id: 'audio', label: '音檔不一致' },
  { id: 'meaning', label: '字義有誤／疑慮' },
  { id: 'translation', label: '翻譯問題' },
  { id: 'example', label: '例句有問題' },
  { id: 'phonetic', label: '音標有誤' },
  { id: 'ui', label: '畫面／排版問題' },
  { id: 'other', label: '其他錯誤' },
]

const REASON_MAP = new Map(REPORT_REASONS.map((r) => [r.id, r]))

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return { contentVersion: CONTENT_VERSION, items: {} }
  return {
    contentVersion: raw.contentVersion || 0,
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
  }
}

function normalizeReasonIds(reasonIds) {
  const list = Array.isArray(reasonIds) ? reasonIds : reasonIds ? [reasonIds] : []
  const seen = new Set()
  const out = []
  for (const id of list) {
    if (!REASON_MAP.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out.length ? out : ['other']
}

function labelsFor(reasonIds) {
  return reasonIds.map((id) => REASON_MAP.get(id)?.label || id)
}

/** Load reported cards — persists across content updates until user manually clears. */
export function loadReportedCards() {
  const store = normalizeStore(loadJSON(STORAGE_KEY, null))
  if (store.contentVersion !== CONTENT_VERSION) {
    const next = { ...store, contentVersion: CONTENT_VERSION }
    saveJSON(STORAGE_KEY, next)
    return next
  }
  return store
}

export function saveReportedCards(store) {
  saveJSON(STORAGE_KEY, {
    contentVersion: CONTENT_VERSION,
    items: store.items || {},
  })
}

export function reportedIdSet(store = loadReportedCards()) {
  return new Set(Object.keys(store.items || {}))
}

export function isCardReported(id, store = loadReportedCards()) {
  return Boolean(id && store.items?.[id])
}

/**
 * @param {object} card
 * @param {string|string[]} reasonIds
 * @param {string} note
 * @param {object} store
 */
export function reportCard(card, reasonIds, note = '', store = loadReportedCards()) {
  if (!card?.id) return store
  const reasons = normalizeReasonIds(reasonIds)
  const reasonLabels = labelsFor(reasons)
  const next = {
    contentVersion: CONTENT_VERSION,
    items: {
      ...store.items,
      [card.id]: {
        id: card.id,
        word: card.word || card.id,
        type: card.type || 'vocab',
        reason: reasons[0],
        reasonLabel: reasonLabels.join('、'),
        reasons,
        reasonLabels,
        note: String(note || '').trim().slice(0, 200),
        at: new Date().toISOString(),
        contentVersion: CONTENT_VERSION,
      },
    },
  }
  saveReportedCards(next)
  return next
}

export function unreportCard(id, store = loadReportedCards()) {
  if (!id || !store.items?.[id]) return store
  const items = { ...store.items }
  delete items[id]
  const next = { contentVersion: CONTENT_VERSION, items }
  saveReportedCards(next)
  return next
}

export function clearAllReports() {
  const next = { contentVersion: CONTENT_VERSION, items: {} }
  saveReportedCards(next)
  return next
}

export function filterOutReported(cards, store = loadReportedCards()) {
  const hidden = reportedIdSet(store)
  if (!hidden.size) return cards
  return cards.filter((c) => !hidden.has(c.id))
}

/** Serialize reports for copy/export (device-local). */
export function exportReportsJson(store = loadReportedCards()) {
  const items = Object.values(store.items || {})
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      contentVersion: store.contentVersion,
      count: items.length,
      items: items.sort((a, b) => (a.at || '').localeCompare(b.at || '')),
    },
    null,
    2,
  )
}
