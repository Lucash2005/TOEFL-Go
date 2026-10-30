import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { todayKey } from '../utils/storage'
import { describeQuizSource, pickAdaptiveQuiz } from '../utils/quizFromProgress'

export default function Quiz() {
  const { recordQuiz, cardProgress, dailyPlan, todayVocab, todayReview, dueDrillCount } =
    useProgress()
  const [section, setSection] = useState('all')
  const [view, setView] = useState('hub')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [sourceInfo, setSourceInfo] = useState(null)
  const correctRef = useRef(0)
  const missedRef = useRef([])

  const question = questions[current]
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `${current + 1} / ${questions.length}`
  }, [current, questions.length])

  const focusHint = useMemo(() => {
    const n = (todayVocab?.length || 0) + (todayReview?.length || 0)
    return n > 0
      ? `優先考今日 ${todayVocab?.length || 0} 單字與 ${todayReview?.length || 0} 張到期複習`
      : '依已學單字與 SRS 動態出題，不足再補題庫'
  }, [todayVocab, todayReview])

  function start() {
    const qs = pickAdaptiveQuiz({
      count: 8,
      section,
      cardProgress,
      dailyPlan,
      today: todayKey(),
    })
    setQuestions(qs)
    setSourceInfo(describeQuizSource(qs))
    setCurrent(0)
    setSelected(null)
    setRevealed(false)
    setFinished(false)
    setCorrectCount(0)
    correctRef.current = 0
    missedRef.current = []
    setStarted(true)
  }

  function choose(idx) {
    if (revealed || !question) return
    setSelected(idx)
    setRevealed(true)
    if (idx === question.answer) {
      correctRef.current += 1
      setCorrectCount(correctRef.current)
    } else {
      if (question.vocabId) missedRef.current.push(question.vocabId)
      const correctText = question.options[question.answer]
      if (correctText) missedRef.current.push(correctText)
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      recordQuiz(correctRef.current, questions.length, missedRef.current)
      setFinished(true)
      return
    }
    setCurrent((c) => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  if (!started && view === 'hub') {
    return (
      <div className="space-y-5">
        <section className="animate-fade-up">
          <h2 className="font-display text-2xl font-bold text-ink">測驗與加強</h2>
          <p className="mt-1 text-sm text-ink-soft">
            模擬測驗對齊你的單字進度；基礎加強專補易混對照，不影響今日單字排程。
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="surface soft-shadow animate-fade-up stagger-1 flex flex-col rounded-3xl p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-ink">托福模擬測驗</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
              依今日計畫與 SRS 動態出題。錯題會把對應單字卡排進複習。
            </p>
            <p className="mt-2 text-xs text-tide">{focusHint}</p>
            <button
              type="button"
              onClick={() => setView('exam')}
              className="mt-5 w-full rounded-2xl bg-tide px-4 py-3.5 text-base font-medium text-white transition hover:bg-tide-deep"
            >
              進入模擬測驗
            </button>
          </section>

          <section className="surface soft-shadow animate-fade-up stagger-2 flex flex-col rounded-3xl p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-ink">基礎加強</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
              易混單字、搭配與閱讀／校園填空。錯題走獨立佇列，不扣掌握進度。
            </p>
            {dueDrillCount > 0 ? (
              <p className="mt-2 text-xs text-coral">{dueDrillCount} 題待複習</p>
            ) : (
              <p className="mt-2 text-xs text-tide">選修 · 約 8 題一輪</p>
            )}
            <Link
              to="/drill"
              className="mt-5 block w-full rounded-2xl bg-coral px-4 py-3.5 text-center text-base font-medium text-white transition hover:bg-coral/90"
            >
              開始加強練習
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="space-y-5">
        <section className="animate-fade-up">
          <button
            type="button"
            onClick={() => setView('hub')}
            className="text-sm text-tide hover:underline"
          >
            ← 回測驗首頁
          </button>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">托福模擬測驗</h2>
          <p className="mt-1 text-sm text-ink-soft">
            依學習進度動態出題。每次題目與選項順序都會重洗。
          </p>
          <p className="mt-2 text-xs text-tide">{focusHint}</p>
        </section>
        <section className="surface soft-shadow rounded-3xl p-5">
          <h3 className="font-medium text-ink">選擇範圍</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: 'all', label: '綜合' },
              { id: 'vocab', label: '單字' },
              { id: 'reading', label: '閱讀策略' },
              { id: 'listening', label: '聽力策略' },
              { id: 'speaking', label: '口說' },
              { id: 'writing', label: '寫作' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSection(m.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  section === m.id ? 'bg-tide text-white' : 'bg-white ring-1 ring-line text-ink-soft'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={start}
            className="mt-6 w-full rounded-2xl bg-tide px-4 py-3.5 text-white hover:bg-tide-deep"
          >
            開始 8 題
          </button>
        </section>
      </div>
    )
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100)
    return (
      <section className="surface soft-shadow mx-auto max-w-lg rounded-3xl p-6 text-center">
        <p className="text-sm text-tide">本回結果</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-ink">
          {correctCount}/{questions.length}
        </h2>
        <p className="mt-2 text-ink-soft">正確率 {pct}%</p>
        {sourceInfo ? (
          <p className="mt-2 text-xs text-ink-soft">
            本回：進度題 {sourceInfo.dynamic} · 補充題 {sourceInfo.curated}
          </p>
        ) : null}
        <div className="mx-auto mt-5 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-mist">
          <div className="h-full rounded-full bg-tide" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={start} className="rounded-2xl bg-tide px-5 py-3 text-white">
            再考一回
          </button>
          <button
            type="button"
            onClick={() => {
              setStarted(false)
              setView('hub')
            }}
            className="rounded-2xl bg-white px-5 py-3 ring-1 ring-line"
          >
            回設定
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">模擬測驗</h2>
        <span className="rounded-full bg-mist px-3 py-1 text-xs text-tide">{progressLabel}</span>
      </div>
      {sourceInfo ? (
        <p className="text-xs text-ink-soft">
          依進度出題（動態 {sourceInfo.dynamic}／補充 {sourceInfo.curated}）
        </p>
      ) : null}
      <article className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <span className="rounded-full bg-tide/10 px-3 py-1 text-xs font-medium text-tide">
          {question.section}
        </span>
        {question.passage ? (
          <div className="mt-4 rounded-2xl bg-mist/80 p-4 text-sm leading-relaxed text-ink">
            {question.passage}
          </div>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">
          {question.prompt}
        </p>
        <div className="mt-5 space-y-2">
          {question.options.map((opt, idx) => {
            let style = 'bg-white ring-1 ring-line'
            if (revealed) {
              if (idx === question.answer) style = 'bg-tide text-white'
              else if (idx === selected) style = 'bg-coral text-white'
            }
            return (
              <button
                key={opt}
                type="button"
                disabled={revealed}
                onClick={() => choose(idx)}
                className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm ${style}`}
              >
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs">
                  {idx + 1}
                </span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>
        {revealed ? (
          <div className="mt-5 rounded-2xl bg-mist/90 p-4">
            <p className="text-sm font-medium text-tide">
              {selected === question.answer ? '答對了！' : '再接再厲'}
            </p>
            <p className="mt-2 text-sm text-ink">{question.explanation}</p>
            {selected !== question.answer && question.vocabId ? (
              <p className="mt-2 text-xs text-ink-soft">這張單字已排進今天的複習佇列。</p>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="mt-4 w-full rounded-2xl bg-tide px-4 py-3 text-white"
            >
              {current + 1 >= questions.length ? '看成績' : '下一題'}
            </button>
          </div>
        ) : null}
      </article>
    </div>
  )
}
