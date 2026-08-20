#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { vocabulary } from '../src/data/vocabulary.js'
import { uniqueExamples } from './unique-examples.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function inflectionOk(word, sentence) {
  const w = word.toLowerCase()
  const s = sentence.toLowerCase()
  if (s.includes(w)) return true
  // common inflections
  const variants = new Set([w])
  if (w.endsWith('y') && w.length > 3) {
    variants.add(`${w.slice(0, -1)}ies`)
    variants.add(`${w.slice(0, -1)}ied`)
  }
  if (w.endsWith('e')) {
    variants.add(`${w}d`)
    variants.add(`${w}s`)
    variants.add(`${w.slice(0, -1)}ing`)
  } else {
    variants.add(`${w}s`)
    variants.add(`${w}ed`)
    variants.add(`${w}ing`)
    variants.add(`${w}${w.slice(-1)}ed`)
    variants.add(`${w}${w.slice(-1)}ing`)
  }
  if (w.endsWith('s') || w.endsWith('x') || w.endsWith('ch') || w.endsWith('sh')) {
    variants.add(`${w}es`)
  }
  // irregular-ish
  if (w === 'be') variants.add('is').add('are').add('was').add('were')
  return [...variants].some((v) => new RegExp(`\\b${v}\\b`, 'i').test(sentence))
}

const missing = []
const unused = []
const weak = []
for (const card of vocabulary) {
  const row = uniqueExamples[card.id]
  if (!row) {
    missing.push(card.id + ' ' + card.word)
    continue
  }
  const example = Array.isArray(row) && row.length >= 3 ? row[1] : row[0]
  if (!inflectionOk(card.word, example)) weak.push(`${card.id} ${card.word} :: ${example}`)
}
for (const id of Object.keys(uniqueExamples)) {
  if (!vocabulary.find((c) => c.id === id)) unused.push(id)
}

if (missing.length || unused.length) {
  console.error('missing', missing)
  console.error('unused', unused)
  process.exit(1)
}
if (weak.length) {
  console.warn('word not clearly in sentence (' + weak.length + '):')
  for (const line of weak) console.warn(' ', line)
}

const next = vocabulary.map((card) => {
  const row = uniqueExamples[card.id]
  const register = row[0]
  const example = row[1]
  const exampleMeaning = row[2]
  return { ...card, register, example, exampleMeaning }
})

function jsString(value) {
  return JSON.stringify(value)
}

const lines = [
  '/** @typedef {{ id: string, word: string, phonetic?: string, meaning: string, example: string, exampleMeaning: string, category: string, register?: string }} VocabCard */',
  '',
  '/** @type {VocabCard[]} */',
  'export const vocabulary = [',
]
for (const card of next) {
  lines.push('  {')
  lines.push(`    id: ${jsString(card.id)},`)
  lines.push(`    word: ${jsString(card.word)},`)
  if (card.phonetic) lines.push(`    phonetic: ${jsString(card.phonetic)},`)
  lines.push(`    meaning: ${jsString(card.meaning)},`)
  lines.push(`    example: ${jsString(card.example)},`)
  lines.push(`    exampleMeaning: ${jsString(card.exampleMeaning)},`)
  if (card.register) lines.push(`    register: ${jsString(card.register)},`)
  lines.push(`    category: ${jsString(card.category)},`)
  lines.push('  },')
}
lines.push(']')
lines.push('')

const outPath = join(__dirname, '../src/data/vocabulary.js')
writeFileSync(outPath, lines.join('\n'))
console.log('wrote', next.length, 'cards to', outPath)
