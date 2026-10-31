import { DAILY_QUOTA } from '../data/config.js'
import { THEME_PLAN_VERSION, VOCAB_THEMES, themeForCard } from '../data/themes.js'
import { vocabulary } from '../data/vocabulary.js'
import { getDueIds, isLearned, normalizeEntry } from './srs.js'
import { todayKey } from './storage.js'

/** Deterministic PRNG from a string seed (xmur3 + mulberry32), same as N4-Go. */
function mulberry32(seed) {
  let t = seed >>> 0
  return function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h >>> 0) || 1
}

export function seededShuffle(items, seedStr) {
  const rand = mulberry32(hashSeed(seedStr))
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickByPriority(cards, count, seedStr, cardProgress, date = todayKey(), options = {}) {
  if (count <= 0 || !cards.length) return []

  const { excludeLearned = true } = options
  const hidden = options.hiddenIds || new Set()
  const visible = hidden.size ? cards.filter((c) => !hidden.has(c.id)) : cards
  const pool = excludeLearned
    ? visible.filter((c) => !isLearned(cardProgress[c.id], date))
    : visible
  if (!pool.length) return []

  const newOnes = pool.filter((c) => !normalizeEntry(cardProgress[c.id], date))
  const dueOnes = pool.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due <= date && e.status !== 'learned'
  })
  const learningOnes = pool.filter((c) => {
    const e = normalizeEntry(cardProgress[c.id], date)
    return e && e.due > date && e.status !== 'learned'
  })
  const learnedOnes = excludeLearned
    ? []
    : pool.filter((c) => {
        const e = normalizeEntry(cardProgress[c.id], date)
        return e && e.status === 'learned' && e.due > date
      })

  const ordered = [
    ...seededShuffle(newOnes, `${seedStr}:new`),
    ...seededShuffle(dueOnes, `${seedStr}:due`),
    ...seededShuffle(learningOnes, `${seedStr}:learning`),
    ...seededShuffle(learnedOnes, `${seedStr}:learned`),
  ]

  const seen = new Set()
  const picked = []
  for (const card of ordered) {
    if (seen.has(card.id)) continue
    seen.add(card.id)
    picked.push(card.id)
    if (picked.length >= count) break
  }
  return picked
}

function pickTodayThemes(date, seedExtra, count) {
  const shuffled = seededShuffle(VOCAB_THEMES, `toefl-go:${date}:themes:${seedExtra || ''}`)
  return shuffled.slice(0, Math.max(1, count))
}

function cardsInThemes(themes, pool) {
  const ids = new Set(themes.map((t) => t.id))
  return pool.filter((card) => ids.has(themeForCard(card).id))
}

/**
 * Prefer one daily theme (plus related themes), then fall back to the full pool.
 * Same layered idea as N4-Go's grammar-example co-occurrence picker.
 */
function pickVocabThemed(count, seedStr, cardProgress, date, options = {}) {
  const themeCount = count > 24 ? 2 : 1
  const primary = pickTodayThemes(date, options.seedExtra, themeCount)
  const related = primary
    .flatMap((theme) => (theme.related || []).map((id) => VOCAB_THEMES.find((t) => t.id === id)))
    .filter(Boolean)
  const pool = options.pool || vocabulary

  const layers = [
    cardsInThemes(primary, pool),
    cardsInThemes(related, pool),
    pool,
  ]

  const picked = []
  const seen = new Set()
  for (let i = 0; i < layers.length && picked.length < count; i += 1) {
    const layer = layers[i].filter((c) => !seen.has(c.id))
    const ids = pickByPriority(
      layer,
      count - picked.length,
      `${seedStr}:layer${i}`,
      cardProgress,
      date,
      options,
    )
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      picked.push(id)
    }
  }
  return { vocabIds: picked, themes: primary }
}

export function buildDailyPlan(date, cardProgress = {}, seedExtra = '', opts = {}) {
  const vocabQuota = Math.max(
    DAILY_QUOTA.vocab,
    Math.min(40, Number(opts.vocabQuota) || DAILY_QUOTA.vocab),
  )
  const hiddenIds = opts.hiddenIds || new Set()
  const pool = vocabulary.filter((v) => !hiddenIds.has(v.id))
  const seed = `toefl-go:${date}${seedExtra ? `:${seedExtra}` : ''}`
  const themed = pickVocabThemed(vocabQuota, `${seed}:vocab`, cardProgress, date, {
    excludeLearned: opts.excludeLearned ?? true,
    hiddenIds,
    seedExtra,
    pool,
  })
  const reviewIds = getDueIds(
    cardProgress,
    pool.map((v) => v.id),
    DAILY_QUOTA.review,
    date,
  )

  return {
    date,
    seedExtra,
    themePlanVersion: THEME_PLAN_VERSION,
    vocabQuota,
    vocabIds: themed.vocabIds,
    themeIds: themed.themes.map((t) => t.id),
    themeLabels: themed.themes.map((t) => t.label),
    reviewIds,
    studiedIds: [],
    practiceDone: { reading: false, listening: false, speaking: false, writing: false },
  }
}

export function emptyDailyPlan(date) {
  return buildDailyPlan(date, {})
}

export function describeTodayThemes(plan) {
  const labels = plan?.themeLabels?.filter(Boolean)
  if (labels?.length) return labels.join('、')
  const ids = plan?.themeIds || []
  return ids
    .map((id) => VOCAB_THEMES.find((t) => t.id === id)?.label)
    .filter(Boolean)
    .join('、')
}
