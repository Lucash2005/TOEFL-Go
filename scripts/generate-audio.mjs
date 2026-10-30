#!/usr/bin/env node
/**
 * Generate Neural TTS MP3s (same approach as N4 Go).
 * English: en-US-JennyNeural (word / example / listening scripts)
 * Chinese: zh-TW-HsiaoChenNeural (meaning / exampleMeaning)
 *
 * Prefers the Python `edge-tts` CLI (reliable). Falls back to
 * `edge-tts-universal` if the CLI is missing.
 *
 * Run: node scripts/generate-audio.mjs
 * Force regenerate: FORCE=1 node scripts/generate-audio.mjs
 * Subset: ONLY=en|zh|listening|example-meaning node scripts/generate-audio.mjs
 * Concurrency: CONCURRENCY=6 node scripts/generate-audio.mjs
 */
import { spawn } from 'child_process'
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { EdgeTTS } from 'edge-tts-universal'
import { vocabulary } from '../src/data/vocabulary.js'
import { listeningSets } from '../src/data/practice.js'
import { stripSpokenRegister } from '../src/utils/speechText.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/audio')
mkdirSync(outDir, { recursive: true })

const EN_VOICE = 'en-US-JennyNeural'
const ZH_VOICE = 'zh-TW-HsiaoChenNeural'
const only = process.env.ONLY || 'all' // all | en | zh | listening | example-meaning
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

function resolveEdgeTtsBin() {
  const candidates = [
    process.env.EDGE_TTS_BIN,
    join(homedir(), '.local/bin/edge-tts'),
    '/usr/local/bin/edge-tts',
    '/usr/bin/edge-tts',
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return 'edge-tts'
}

const EDGE_TTS_BIN = resolveEdgeTtsBin()

function synthesizeWithCli(text, filePath, voice, timeoutMs = 40000) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      EDGE_TTS_BIN,
      [
        `--voice=${voice}`,
        '--rate=-5%',
        '--pitch=+0Hz',
        `--text=${text}`,
        `--write-media=${filePath}`,
        '--no-progress',
      ],
      {
        env: {
          ...process.env,
          PATH: `${join(homedir(), '.local/bin')}:${process.env.PATH || ''}`,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`edge-tts timeout ${timeoutMs}ms`))
    }, timeoutMs)
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && existsSync(filePath)) {
        resolve('ok')
        return
      }
      reject(new Error(stderr.trim() || `edge-tts exit ${code}`))
    })
  })
}

async function synthesizeWithLibrary(text, filePath, voice) {
  const tts = new EdgeTTS(text, voice, { rate: '-5%', pitch: '+0Hz' })
  const result = await withTimeout(tts.synthesize(), 25000, 'synthesize')
  const raw = result.audio
  const buf = Buffer.from(raw instanceof Blob ? await raw.arrayBuffer() : raw)
  if (buf.length < 200) throw new Error(`tiny audio ${buf.length}`)
  writeFileSync(filePath, buf)
}

async function synthesizeToFile(text, filePath, voice) {
  const cleaned = cleanText(text)
  if (!cleaned) return 'empty'
  if (!force && existsSync(filePath)) return 'skip'
  let lastErr
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      if (existsSync(filePath)) unlinkSync(filePath)
      if (EDGE_TTS_BIN) {
        await synthesizeWithCli(cleaned, filePath, voice)
      } else {
        await synthesizeWithLibrary(cleaned, filePath, voice)
      }
      if (!existsSync(filePath)) throw lastErr || new Error('no audio written')
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
        text: stripSpokenRegister(card.meaning),
        path: join(outDir, `${card.id}-meaning.mp3`),
        voice: ZH_VOICE,
      })
    }
  }
  if (only === 'all' || only === 'zh' || only === 'example-meaning') {
    if (card.exampleMeaning) {
      jobs.push({
        text: stripSpokenRegister(card.exampleMeaning),
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
    'edge-tts',
    EDGE_TTS_BIN,
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
