#!/usr/bin/env node
/**
 * Generate Neural TTS MP3s (same approach as N4 Go).
 * English: en-US-JennyNeural (word / example / listening scripts)
 * Chinese: zh-TW-HsiaoChenNeural (meaning / exampleMeaning)
 *
 * Run: node scripts/generate-audio.mjs
 * Force regenerate: FORCE=1 node scripts/generate-audio.mjs
 * Subset: ONLY=en|zh|listening node scripts/generate-audio.mjs
 * Concurrency: CONCURRENCY=6 node scripts/generate-audio.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { EdgeTTS } from 'edge-tts-universal'
import { vocabulary } from '../src/data/vocabulary.js'
import { listeningSets } from '../src/data/practice.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/audio')
mkdirSync(outDir, { recursive: true })

const EN_VOICE = 'en-US-JennyNeural'
const ZH_VOICE = 'zh-TW-HsiaoChenNeural'
const only = process.env.ONLY || 'all' // all | en | zh | listening
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 6))
const force = process.env.FORCE === '1'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function cleanText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label || 'timeout'} ${ms}ms`)), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

async function synthesizeToFile(text, filePath, voice) {
  const cleaned = cleanText(text)
  if (!cleaned) return 'empty'
  if (!force && existsSync(filePath)) return 'skip'
  let lastErr
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const tts = new EdgeTTS(cleaned, voice, { rate: '-5%', pitch: '+0Hz' })
      const result = await withTimeout(tts.synthesize(), 25000, 'synthesize')
      const raw = result.audio
      const buf = Buffer.from(raw instanceof Blob ? await raw.arrayBuffer() : raw)
      if (buf.length < 200) throw new Error(`tiny audio ${buf.length}`)
      writeFileSync(filePath, buf)
      return 'ok'
    } catch (err) {
      lastErr = err
      await sleep(400 * (attempt + 1))
    }
  }
  throw lastErr || new Error(`failed ${filePath}`)
}

function jobsForCard(card) {
  const jobs = []
  if (only === 'all' || only === 'en') {
    jobs.push({
      text: card.word,
      path: join(outDir, `${card.id}-word.mp3`),
      voice: EN_VOICE,
    })
    jobs.push({
      text: card.example,
      path: join(outDir, `${card.id}-example.mp3`),
      voice: EN_VOICE,
    })
  }
  if (only === 'all' || only === 'zh') {
    if (card.meaning) {
      jobs.push({
        text: card.meaning,
        path: join(outDir, `${card.id}-meaning.mp3`),
        voice: ZH_VOICE,
      })
    }
    if (card.exampleMeaning) {
      jobs.push({
        text: card.exampleMeaning,
        path: join(outDir, `${card.id}-example-meaning.mp3`),
        voice: ZH_VOICE,
      })
    }
  }
  return jobs
}

function jobsForListening(item) {
  if (only !== 'all' && only !== 'listening' && only !== 'en') return []
  return [
    {
      text: item.script,
      path: join(outDir, `${item.id}.mp3`),
      voice: EN_VOICE,
    },
  ]
}

async function runPool(jobs, n, fn) {
  let index = 0
  let ok = 0
  let skipped = 0
  let failed = 0
  async function worker() {
    while (index < jobs.length) {
      const current = jobs[index]
      index += 1
      try {
        const result = await fn(current)
        if (result === 'ok') ok += 1
        else skipped += 1
      } catch (err) {
        failed += 1
        console.error('fail', current.path, err.message || err)
      }
      const done = ok + skipped + failed
      if (done % 50 === 0 || done === jobs.length) {
        console.log(`audio ${done}/${jobs.length} ok=${ok} skip=${skipped} fail=${failed}`)
      }
    }
  }
  await Promise.all(Array.from({ length: n }, worker))
  return { ok, skipped, failed }
}

const allJobs = [
  ...vocabulary.flatMap(jobsForCard),
  ...listeningSets.flatMap(jobsForListening),
]
const jobs = force ? allJobs : allJobs.filter((job) => !existsSync(job.path))

async function main() {
  console.log(
    'cards',
    vocabulary.length,
    'listening',
    listeningSets.length,
    'jobs',
    jobs.length,
    'concurrency',
    concurrency,
  )
  const stats = await runPool(jobs, concurrency, (job) =>
    synthesizeToFile(job.text, job.path, job.voice),
  )
  console.log('done', stats)
  if (stats.failed) process.exitCode = 1
}

process.on('SIGPIPE', () => {})
process.stdout.on?.('error', () => {})
process.stderr.on?.('error', () => {})

const keepAlive = setInterval(() => {}, 15000)
try {
  await main()
} finally {
  clearInterval(keepAlive)
}
