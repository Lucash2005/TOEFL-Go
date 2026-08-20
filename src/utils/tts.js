import { stopPlaylist } from './playlistPlayer'

let audioEl = null
let objectUrl = null

function stopAudio() {
  if (audioEl) {
    audioEl.pause()
    audioEl.removeAttribute('src')
    audioEl.load?.()
    audioEl = null
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
}

export function speechTextForCard(card, { flipped = false } = {}) {
  if (!card) return ''
  if (flipped) return card.example || card.word
  return card.word
}

export function audioClipForCard(card, { flipped = false } = {}) {
  if (!card?.id) return null
  const kind = flipped ? 'example' : 'word'
  const base = import.meta.env.BASE_URL || './'
  return `${base}audio/${card.id}-${kind}.mp3`
}

export function audioClipForListening(id) {
  if (!id) return null
  const base = import.meta.env.BASE_URL || './'
  return `${base}audio/${id}.mp3`
}

function playUrl(url, options = {}) {
  stopAudio()
  audioEl = new Audio(url)
  audioEl.preload = 'auto'
  if (typeof options.rate === 'number') {
    audioEl.playbackRate = Math.min(1.25, Math.max(0.7, options.rate))
  }
  const playPromise = audioEl.play()
  if (playPromise?.catch) {
    playPromise.catch(() => {
      options.onFail?.()
    })
  }
  audioEl.addEventListener('error', () => options.onFail?.(), { once: true })
  audioEl.addEventListener('playing', () => options.onPlay?.(), { once: true })
}

/**
 * Play English (or Chinese clip) via prebuilt Neural MP3s.
 * No system speechSynthesis — same approach as N4 Go.
 */
export function speakEnglish(text, options = {}) {
  if (typeof window === 'undefined') return Promise.resolve({ engine: 'none' })

  try {
    stopPlaylist()
  } catch {
    /* playlist module optional during init */
  }

  const clipUrl = options.clipUrl
  const onEngine = options.onEngine

  stopAudio()

  if (clipUrl) {
    return new Promise((resolve) => {
      let settled = false
      const done = (engine) => {
        if (settled) return
        settled = true
        onEngine?.(engine)
        resolve({ engine })
      }

      playUrl(clipUrl, {
        rate: options.rate,
        onPlay: () => done('neural'),
        onFail: () => done('none'),
      })
    })
  }

  onEngine?.('none')
  return Promise.resolve({ engine: 'none' })
}

export function stopSpeaking() {
  stopAudio()
  try {
    stopPlaylist()
  } catch {
    /* ignore */
  }
}
