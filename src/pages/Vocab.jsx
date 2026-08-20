import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { vocabulary } from '../data/vocabulary'
import { useProgress } from '../hooks/useProgress'
import { useSettings } from '../hooks/useSettings'
import { getFilterStatus, GRADE_LABELS } from '../utils/srs'
import {
  buildCardTracks,
  getPlaylistState,
  next as playlistNext,
  pause as playlistPause,
  previous as playlistPrevious,
  resume as playlistResume,
  startPlaylist,
  stop as playlistStop,
  subscribePlaylist,
} from '../utils/playlistPlayer'
import { speakEnglish, speechTextForCard, audioClipForCard, stopSpeaking } from '../utils/tts'

const GRADES = ['again', 'hard', 'good', 'easy']

const MODE_META = {
  today: {
    title: '今日單字',
    hint: '先回想意思，翻面後評分。例句是原創的托福講座／校園對話／閱讀口吻。',
  },
  review: {
    title: '到期複習',
    hint: '只出現今天該複習的卡片 · 評分越準，記住越久',
  },
  all: {
    title: '全部單字',
    hint: '點擊卡片翻面 · 例句分成講座／校園對話／閱讀三種口吻',
  },
}

function seededShuffle(list, seed) {
  const copy = [...list]
  let h = 1779033703 ^ String(seed).length
  for (let i = 0; i < String(seed).length; i += 1) {
    h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let t = (h >>> 0) + 0x6d2b79f5
  const rand = () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function Vocab() {
  const { cardProgress, todayVocab, todayReview, gradeCard, getEntry, setCardStatus } = useProgress()
  const {
    showPhonetic,
    setShowPhonetic,
    showExampleMeaning,
    setShowExampleMeaning,
    ttsRate,
    setTtsRate,
    loopPlayWord,
    loopPlayExample,
    loopPlayMeaning,
    loopPlayExampleMeaning,
    setLoopPlayWord,
    setLoopPlayExample,
    setLoopPlayMeaning,
    setLoopPlayExampleMeaning,
  } = useSettings()
  const [params] = useSearchParams()
  const mode = params.get('mode') || 'today'
  const srsMode = mode === 'today' || mode === 'review'

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [voiceEngine, setVoiceEngine] = useState(null)
  const [sessionLeft, setSessionLeft] = useState(null)
  const [browseSeed] = useState(() => `${Date.now()}-${Math.random()}`)
  const [playlist, setPlaylist] = useState(() => getPlaylistState())

  const filtered = useMemo(() => {
    if (mode === 'review') return todayReview
    if (mode === 'today') return todayVocab.length ? todayVocab : vocabulary.slice(0, 20)
    const q = query.trim().toLowerCase()
    const list = vocabulary.filter((card) => {
      const status = getFilterStatus(cardProgress, card.id)
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!q) return true
      const hay = [card.word, card.phonetic, card.meaning, card.example, card.exampleMeaning, card.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    return seededShuffle(list, `browse:${browseSeed}:${statusFilter}:${q}`)
  }, [mode, todayVocab, todayReview, query, statusFilter, cardProgress, browseSeed])

  const deck = sessionLeft ?? filtered

  useEffect(() => subscribePlaylist(setPlaylist), [])

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    if (!srsMode) setSessionLeft(null)
  }, [mode, query, statusFilter, srsMode])

  useEffect(() => {
    if (!srsMode) return
    setSessionLeft(seededShuffle(filtered, `srs-enter:${Date.now()}:${Math.random()}`))
    setIndex(0)
    setFlipped(false)
    // snapshot only on mode enter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    const cardId = playlist.track?.cardId
    if (!cardId || !deck.length) return
    const idx = deck.findIndex((c) => c.id === cardId)
    if (idx >= 0 && idx !== index) {
      setIndex(idx)
      setFlipped(playlist.track?.kind === 'example' || playlist.track?.kind === 'exampleMeaning')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.track?.id, playlist.playing])

  const safeIndex = deck.length ? Math.min(index, deck.length - 1) : 0
  const card = deck[safeIndex]
  const entry = card ? getEntry(card.id) : null
  const doneSession = srsMode && sessionLeft && sessionLeft.length === 0
  const loopActive = playlist.total > 0
  const meta = MODE_META[mode] || MODE_META.all

  function go(delta) {
    if (!deck.length) return
    setFlipped(false)
    setIndex((prev) => (prev + delta + deck.length) % deck.length)
  }

  function flipCard() {
    setFlipped((f) => !f)
  }

  function onGrade(grade) {
    if (!card) return
    gradeCard(card.id, grade)
    setFlipped(false)

    if (srsMode && sessionLeft) {
      if (grade === 'again') {
        const rest = sessionLeft.filter((c) => c.id !== card.id)
        setSessionLeft([...rest, card])
        setIndex(safeIndex >= rest.length ? 0 : safeIndex)
        return
      }
      const nextDeck = sessionLeft.filter((c) => c.id !== card.id)
      setSessionLeft(nextDeck)
      if (!nextDeck.length) {
        setIndex(0)
        return
      }
      setIndex(Math.min(safeIndex, nextDeck.length - 1))
      return
    }

    go(1)
  }

  function playAudio() {
    if (!card) return
    playlistStop()
    const text = speechTextForCard(card, { flipped })
    const clipUrl = audioClipForCard(card, { flipped })
    setVoiceEngine('…')
    speakEnglish(text, {
      rate: ttsRate,
      clipUrl,
      onEngine: (engine) => setVoiceEngine(engine === 'neural' ? 'neural' : 'none'),
    })
  }

  const loopOptions = {
    playWord: loopPlayWord,
    playExample: loopPlayExample,
    playMeaning: loopPlayMeaning,
    playExampleMeaning: loopPlayExampleMeaning,
  }
  const loopSelectionValid =
    loopPlayWord || loopPlayExample || loopPlayMeaning || loopPlayExampleMeaning

  function startLoopPlay() {
    if (!deck.length || !loopSelectionValid) return
    stopSpeaking()
    const startCardIndex = Math.max(0, safeIndex)
    const currentId = deck[startCardIndex]?.id
    const rotated = [...deck.slice(startCardIndex), ...deck.slice(0, startCardIndex)]
    const tracks = buildCardTracks(rotated, loopOptions)
    if (!tracks.length) return
    let startIndex = 0
    if (currentId) {
      const idx = tracks.findIndex((t) => t.cardId === currentId)
      if (idx >= 0) startIndex = idx
    }
    const ok = startPlaylist(tracks, {
      loop: true,
      rate: Math.min(1.25, Math.max(0.7, ttsRate)),
      startIndex,
    })
    if (ok) setVoiceEngine('neural')
  }

  function toggleLoopPlay() {
    if (playlist.playing) {
      playlistPause()
      return
    }
    if (playlist.total > 0 && playlist.track) {
      playlistResume()
      return
    }
    startLoopPlay()
  }

  function toggleLoopOption(key, value, setter) {
    const next = {
      word: loopPlayWord,
      example: loopPlayExample,
      meaning: loopPlayMeaning,
      exampleMeaning: loopPlayExampleMeaning,
      [key]: value,
    }
    if (!next.word && !next.example && !next.meaning && !next.exampleMeaning) return
    setter(value)
    if (playlist.total > 0) {
      queueMicrotask(() => {
        stopSpeaking()
        const startCardIndex = Math.max(0, safeIndex)
        const rotated = [...deck.slice(startCardIndex), ...deck.slice(0, startCardIndex)]
        const tracks = buildCardTracks(rotated, {
          playWord: next.word,
          playExample: next.example,
          playMeaning: next.meaning,
          playExampleMeaning: next.exampleMeaning,
        })
        if (!tracks.length) return
        startPlaylist(tracks, {
          loop: true,
          rate: Math.min(1.25, Math.max(0.7, ttsRate)),
          startIndex: 0,
        })
      })
    }
  }

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">{meta.title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{meta.hint}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link to="/vocab?mode=today" className="text-tide underline-offset-2 hover:underline">
            今日
          </Link>
          <Link to="/vocab?mode=review" className="text-tide underline-offset-2 hover:underline">
            複習
          </Link>
          <Link to="/vocab?mode=all" className="text-tide underline-offset-2 hover:underline">
            全部
          </Link>
        </div>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 space-y-3 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={showPhonetic} onClick={() => setShowPhonetic(!showPhonetic)}>
            {showPhonetic ? '音標：顯示中' : '音標：已隱藏'}
          </FilterChip>
          <FilterChip
            active={showExampleMeaning}
            onClick={() => setShowExampleMeaning(!showExampleMeaning)}
          >
            {showExampleMeaning ? '中文解釋：顯示中' : '中文解釋：已隱藏'}
          </FilterChip>
          <span className="rounded-full bg-tide/10 px-3 py-1.5 text-sm text-tide">發音：Neural 自然聲</span>
        </div>
        <label className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="shrink-0">語速</span>
          <input
            type="range"
            min="0.7"
            max="1.1"
            step="0.02"
            value={ttsRate}
            onChange={(e) => setTtsRate(Number(e.target.value))}
            className="w-full accent-[var(--color-tide)]"
          />
          <span className="w-10 tabular-nums">{ttsRate.toFixed(2)}</span>
        </label>
        <p className="text-xs text-ink-soft">
          練習模式正面不顯示音標，逼自己先回想。翻面後用「忘記／困難／記得／簡單」評分。
          {voiceEngine
            ? ` · 剛剛播放：${voiceEngine === 'neural' ? 'Neural 自然聲' : '音檔未就緒'}`
            : ''}
        </p>
      </section>

      {deck.length > 0 && !doneSession ? (
        <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">循環播放</p>
              <p className="mt-1 text-xs text-ink-soft">
                可開關要播的內容。英文／中文皆為 Neural 音檔，鎖屏後也可繼續。
              </p>
            </div>
            <button
              type="button"
              onClick={toggleLoopPlay}
              disabled={!loopSelectionValid}
              className="rounded-2xl bg-tide px-4 py-2.5 text-sm font-medium text-white hover:bg-tide-deep disabled:opacity-40"
            >
              {playlist.playing ? '暫停' : loopActive ? '繼續播放' : '開始循環'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip
              active={loopPlayWord}
              onClick={() => toggleLoopOption('word', !loopPlayWord, setLoopPlayWord)}
            >
              單字
            </FilterChip>
            <FilterChip
              active={loopPlayMeaning}
              onClick={() => toggleLoopOption('meaning', !loopPlayMeaning, setLoopPlayMeaning)}
            >
              詞義解釋
            </FilterChip>
            <FilterChip
              active={loopPlayExample}
              onClick={() => toggleLoopOption('example', !loopPlayExample, setLoopPlayExample)}
            >
              例句
            </FilterChip>
            <FilterChip
              active={loopPlayExampleMeaning}
              onClick={() =>
                toggleLoopOption(
                  'exampleMeaning',
                  !loopPlayExampleMeaning,
                  setLoopPlayExampleMeaning,
                )
              }
            >
              例句解釋
            </FilterChip>
          </div>

          {loopActive ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-ink">
                {playlist.track?.title || '…'}
                <span className="text-ink-soft">
                  {' '}
                  · {playlist.track?.subtitle || ''} · {playlist.index + 1}/{playlist.total}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => playlistPrevious()}>上一則</ActionButton>
                <ActionButton onClick={() => playlistNext()}>下一則</ActionButton>
                <ActionButton onClick={() => playlistStop()}>停止</ActionButton>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!srsMode ? (
        <section className="surface soft-shadow animate-fade-up stagger-2 space-y-3 rounded-3xl p-4 sm:p-5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋單字、音標、中文、例句…"
            className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-tide/30 focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
              全部
            </FilterChip>
            <FilterChip
              active={statusFilter === 'learned'}
              onClick={() => setStatusFilter(statusFilter === 'learned' ? 'all' : 'learned')}
            >
              只看已學會
            </FilterChip>
            <FilterChip
              active={statusFilter === 'review'}
              onClick={() => setStatusFilter(statusFilter === 'review' ? 'all' : 'review')}
            >
              只看需複習
            </FilterChip>
          </div>
        </section>
      ) : null}

      <p className="text-xs text-ink-soft">
        {srsMode ? `本輪剩餘 ${deck.length} 張` : `共 ${deck.length} 張`}
        {card && !doneSession ? ` · 目前第 ${safeIndex + 1} 張` : ''}
        {entry?.due ? ` · 下次 ${entry.due}` : ''}
      </p>

      {doneSession ? (
        <div className="surface soft-shadow animate-fade-up rounded-3xl p-8 text-center">
          <p className="font-display text-2xl font-bold text-ink">本輪完成</p>
          <p className="mt-2 text-sm text-ink-soft">忘記的卡片會較快再出現</p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-2xl bg-tide px-5 py-3 text-white hover:bg-tide-deep"
          >
            回今日
          </Link>
        </div>
      ) : !card ? (
        <div className="surface rounded-3xl p-8 text-center text-ink-soft">
          {srsMode ? (
            <div className="space-y-3">
              <p>{mode === 'review' ? '目前沒有到期單字' : '今日沒有單字可練'}</p>
              <Link to="/" className="inline-block text-tide underline">
                回今日看進度
              </Link>
            </div>
          ) : (
            '沒有符合條件的卡片'
          )}
        </div>
      ) : (
        <>
          <article
            className="animate-flip-in soft-shadow relative cursor-pointer rounded-3xl [perspective:1200px]"
            onClick={flipCard}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                flipCard()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="翻轉卡片"
          >
            <div
              className={`grid min-h-[280px] transition-transform duration-500 [grid-template-areas:'stack'] [transform-style:preserve-3d] ${
                flipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <CardFace className="[grid-area:stack] [backface-visibility:hidden]">
                <Badge>{card.category}</Badge>
                <p className="font-display mt-6 text-4xl font-bold text-ink sm:text-5xl">
                  {card.word}
                </p>
                {srsMode ? (
                  <p className="mt-3 text-base text-ink-soft">先想意思與搭配，再翻面</p>
                ) : showPhonetic && card.phonetic ? (
                  <p className="mt-3 text-xl text-tide">{card.phonetic}</p>
                ) : (
                  <p className="mt-3 text-base text-ink-soft">音標已隱藏</p>
                )}
                <p className="mt-8 text-base text-ink-soft">點擊查看釋義與例句</p>
              </CardFace>

              <CardFace
                align="start"
                className="[grid-area:stack] [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <Badge>{card.category}</Badge>
                <p className="mt-4 text-3xl font-bold text-ink">{card.meaning}</p>
                {showPhonetic && card.phonetic ? (
                  <p className="mt-1 text-base text-tide">{card.phonetic}</p>
                ) : null}
                <div className="mt-4 w-full rounded-2xl bg-mist/80 p-4 text-left">
                  {card.register ? (
                    <p className="mb-2 text-xs font-medium text-tide">{registerLabel(card.register)}</p>
                  ) : null}
                  <p className="text-lg leading-relaxed text-ink">{card.example}</p>
                  {showExampleMeaning ? (
                    <p className="mt-2 text-base text-ink-soft">{card.exampleMeaning}</p>
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">中文解釋已隱藏</p>
                  )}
                </div>
              </CardFace>
            </div>
          </article>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-1">
            {!srsMode ? <ActionButton onClick={() => go(-1)}>上一張</ActionButton> : null}
            <ActionButton
              onClick={(e) => {
                e.stopPropagation()
                playAudio()
              }}
            >
              播放發音
            </ActionButton>
            {!srsMode ? <ActionButton onClick={() => go(1)}>下一張</ActionButton> : null}
          </div>

          {srsMode ? (
            flipped ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onGrade(g)}
                    className={`touch-target rounded-2xl px-3 py-3 text-sm font-medium ${gradeClass(g)}`}
                  >
                    <span className="block">{GRADE_LABELS[g].label}</span>
                    <span className="mt-0.5 block text-[11px] opacity-80">{GRADE_LABELS[g].hint}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-ink-soft">翻面後評分才會進入下一張</p>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatusButton
                active={getFilterStatus(cardProgress, card.id) === 'learned'}
                onClick={() =>
                  setCardStatus(
                    card.id,
                    getFilterStatus(cardProgress, card.id) === 'learned' ? null : 'learned',
                  )
                }
                tone="tide"
              >
                已學會
              </StatusButton>
              <StatusButton
                active={getFilterStatus(cardProgress, card.id) === 'review'}
                onClick={() =>
                  setCardStatus(
                    card.id,
                    getFilterStatus(cardProgress, card.id) === 'review' ? null : 'review',
                  )
                }
                tone="coral"
              >
                需要複習
              </StatusButton>
              <StatusButton
                className="col-span-2 sm:col-span-1"
                onClick={() => setCardStatus(card.id, null)}
              >
                清除標記
              </StatusButton>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function gradeClass(grade) {
  if (grade === 'again') return 'bg-coral text-white'
  if (grade === 'hard') return 'bg-amber-soft text-ink ring-1 ring-line'
  if (grade === 'good') return 'bg-tide text-white'
  return 'bg-ink text-white'
}

function registerLabel(register) {
  if (register === 'lecture') return '聽力講座口吻'
  if (register === 'campus') return '校園對話口吻'
  if (register === 'reading') return '閱讀篇接口吻'
  return ''
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active ? 'bg-tide text-white' : 'bg-white/80 text-ink-soft ring-1 ring-line'
      }`}
    >
      {children}
    </button>
  )
}

function CardFace({ className = '', align = 'center', children }) {
  return (
    <div
      className={`surface flex h-full min-h-[280px] w-full flex-col items-center rounded-3xl p-5 text-center sm:p-6 ${
        align === 'start' ? 'justify-start' : 'justify-center'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-tide/10 px-3 py-1 text-xs font-medium text-tide">{children}</span>
  )
}

function ActionButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target rounded-2xl bg-white px-5 py-3 text-base font-medium text-ink ring-1 ring-line transition hover:bg-mist"
    >
      {children}
    </button>
  )
}

function StatusButton({ active, onClick, tone = 'line', children, className = '' }) {
  const activeClass =
    tone === 'coral' ? 'bg-coral text-white' : tone === 'tide' ? 'bg-tide text-white' : 'bg-ink text-white'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-target rounded-2xl px-4 py-3 text-sm font-medium transition ${className} ${
        active ? activeClass : 'bg-white text-ink ring-1 ring-line hover:bg-mist'
      }`}
    >
      {children}
    </button>
  )
}
