import { quizQuestions, shuffle, withShuffledOptions } from '../data/quiz'
import { vocabulary } from '../data/vocabulary'
import { stripSpokenRegister } from './speechText'
import { normalizeEntry } from './srs'
import { todayKey } from './storage'

function allVocab() {
  return vocabulary
}

function cardPriority(card, cardProgress, planIds, today) {
  const entry = normalizeEntry(cardProgress[card.id], today)
  let score = 1
  if (planIds.has(card.id)) score += 100
  if (!entry) return score
  if (entry.due <= today) score += 60
  if (entry.status === 'review') score += 40
  else if (entry.status === 'learning') score += 25
  else if (entry.status === 'learned') score += 12
  if (entry.repetitions > 0) score += Math.min(15, entry.repetitions)
  return score
}

function weightedPick(cards, count, rand) {
  const pool = [...cards]
  const picked = []
  while (pool.length && picked.length < count) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0)
    let roll = rand() * total
    let idx = 0
    for (; idx < pool.length; idx += 1) {
      roll -= pool[idx].weight
      if (roll <= 0) break
    }
    idx = Math.min(idx, pool.length - 1)
    picked.push(pool[idx].card)
    pool.splice(idx, 1)
  }
  return picked
}

function distractors(correct, pool, field, count) {
  const correctVal = correct[field]
  const others = shuffle(
    pool.filter((c) => c.id !== correct.id && c[field] && c[field] !== correctVal),
  )
  const sameCat = others.filter((c) => c.category === correct.category)
  const rest = others.filter((c) => c.category !== correct.category)
  const ordered = [...sameCat, ...rest]
  const values = []
  const seen = new Set([correctVal])
  for (const card of ordered) {
    const val = card[field]
    if (seen.has(val)) continue
    seen.add(val)
    values.push(val)
    if (values.length >= count) break
  }
  return values.slice(0, count)
}

function buildMcq({ id, section, prompt, correct, options, explanation, vocabId }) {
  const allOptions = shuffle([correct, ...options]).slice(0, 4)
  if (!allOptions.includes(correct)) {
    allOptions[allOptions.length - 1] = correct
  }
  while (allOptions.length < 4) {
    allOptions.push(`（選項${allOptions.length + 1}）`)
  }
  const answer = allOptions.indexOf(correct)
  return {
    id,
    section,
    prompt,
    options: allOptions,
    answer: answer < 0 ? 0 : answer,
    explanation,
    vocabId,
  }
}

function blankExample(example, target) {
  if (!example || !target) return null
  const re = new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  if (!re.test(example)) return null
  return example.replace(re, '(    )')
}

function vocabQuestionsFor(card, pool) {
  const qs = []
  const meaningOpts = distractors(card, pool, 'meaning', 3)
  if (meaningOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-meaning`,
        section: 'vocab',
        vocabId: card.id,
        prompt: `Choose the best meaning of “${card.word}”.`,
        correct: card.meaning,
        options: meaningOpts,
        explanation: `「${card.word}」＝${card.meaning}。`,
      }),
    )
  }

  const wordOpts = distractors(card, pool, 'word', 3)
  if (wordOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-word`,
        section: 'vocab',
        vocabId: card.id,
        prompt: `Which word matches this meaning?\n${card.meaning}`,
        correct: card.word,
        options: wordOpts,
        explanation: `「${card.meaning}」對應「${card.word}」。`,
      }),
    )
  }

  const blanked = blankExample(card.example, card.word)
  if (blanked && wordOpts.length >= 3) {
    qs.push(
      buildMcq({
        id: `dyn-${card.id}-blank`,
        section: 'vocab',
        vocabId: card.id,
        prompt: `Choose the word that best completes the sentence.\n${blanked}`,
        correct: card.word,
        options: wordOpts,
        explanation: `正解是「${card.word}」。例句意思：${stripSpokenRegister(card.exampleMeaning)}`,
      }),
    )
  }

  return qs
}

function mulberryRand(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function attachVocabId(q) {
  if (q.vocabId) return q
  const m = String(q.prompt || '').match(/[“"']([A-Za-z][A-Za-z-]+)[”"']/)
  if (!m) return q
  const card = vocabulary.find((v) => v.word.toLowerCase() === m[1].toLowerCase())
  return card ? { ...q, vocabId: card.id } : q
}

/**
 * Build a quiz set from learning progress.
 * Prioritizes today's plan + due/review cards; falls back to curated bank.
 */
export function pickAdaptiveQuiz({
  count = 8,
  section = 'all',
  cardProgress = {},
  dailyPlan = {},
  today = todayKey(),
} = {}) {
  const rand = mulberryRand((Date.now() ^ (Math.random() * 1e9)) >>> 0)
  const planIds = new Set([...(dailyPlan.vocabIds || []), ...(dailyPlan.reviewIds || [])])

  const wantVocab = section === 'all' || section === 'vocab'
  const generated = []

  if (wantVocab) {
    const vocabWeighted = allVocab().map((card) => ({
      card,
      weight: cardPriority(card, cardProgress, planIds, today),
    }))
    const vocabTargets = weightedPick(vocabWeighted, Math.max(count, 12), rand)
    for (const card of vocabTargets) {
      const variants = vocabQuestionsFor(card, allVocab())
      if (variants.length) generated.push(variants[Math.floor(rand() * variants.length)])
    }
  }

  let pool = shuffle(generated)

  const curated = quizQuestions
    .filter((q) => (section === 'all' ? true : q.section === section))
    .map(attachVocabId)

  if (section !== 'vocab') {
    const extra = shuffle(curated)
    const take = section === 'all' ? Math.min(3, extra.length) : extra.length
    pool = [...extra.slice(0, take), ...pool]
  }

  if (pool.length < count) {
    const used = new Set(pool.map((q) => q.id))
    for (const q of shuffle(curated)) {
      if (used.has(q.id)) continue
      pool.push(q)
      if (pool.length >= count * 2) break
    }
  }

  pool = shuffle(pool).slice(0, Math.min(count, pool.length))
  return pool.map((q) => withShuffledOptions(q))
}

export function describeQuizSource(questions = []) {
  const dynamic = questions.filter((q) => String(q.id).startsWith('dyn-')).length
  const curated = questions.length - dynamic
  return { dynamic, curated, total: questions.length }
}
