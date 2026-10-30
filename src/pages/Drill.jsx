import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DRILL_THEMES, drillBankSummary } from '../data/drill'
import { useProgress } from '../hooks/useProgress'
import { pickDrillSet } from '../utils/drillProgress'
import { todayKey } from '../utils/storage'

const MODES = [
  {
    id: 'mixed',
    label: '綜合加強',
    desc: '易混單字＋搭配＋短文填空混合，優先出現你錯過的題型',
  },
  {
    id: 'confusable',
    label: '易混對照',
    desc: 'affect／effect、imply／infer、because／because of 等托福常錯對照',
  },
  {
    id: 'passage',
    label: '短文填空',
    desc: '閱讀與校園對話同型：一篇短文拆成數格填空',
  },
  {
    id: 'mistakes',
    label: '錯題複習',
    desc: '只練之前答錯的加強題（獨立 SRS，不影響單字進度）',
  },
]

export default function Drill() {
  const { recordDrillAnswer, dueDrillCount, drillSummary, drillStats, drillProgress } =
    useProgress()
  const [mode, setMode] = useState('mixed')
  const [theme, setTheme] = useState('all')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)

  const question = questions[current]
  const progressLabel = questions.length ? `${current + 1} / ${questions.length}` : ''

  const bank = useMemo(() => drillBankSummary(), [])

  function start() {
    const qs = pickDrillSet({
      mode,
      theme,
      drillProgress,
      count: 8,
      today: todayKey(),
    })
    setQuestions(qs)
    setCurrent(0)
    setSelected(null)
    setRevealed(false)
    setCorrectCount(0)
    setFinished(false)
    setStarted(true)
  }

  function choose(idx) {
    if (revealed || !question) return
    setSelected(idx)
    setRevealed(true)
    const ok = idx === question.answer
    recordDrillAnswer(question.id, ok)
    if (ok) setCorrectCount((c) => c + 1)
  }

  function next() {
    if (current + 1 >= questions.length) {
      setFinished(true)
      return
    }
    setCurrent((c) => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  const themeOptions = useMemo(() => {
    if (mode === 'mistakes') return [{ id: 'all', label: '全部混合' }]
    if (mode === 'confusable') {
      return DRILL_THEMES.filter((t) =>
        ['all', 'vocab-pair', 'collocation', 'grammar'].includes(t.id),
      )
    }
    if (mode === 'passage') {
      return DRILL_THEMES.filter((t) => ['all', 'reading', 'campus'].includes(t.id))
    }
    return DRILL_THEMES
  }, [mode])

  const modeMeta = MODES.find((m) => m.id === mode)

  if (!started) {
    return (
      <div className="space-y-5">
        <section className="animate-fade-up">
          <Link to="/quiz" className="text-sm text-tide hover:underline">
            ← 回測驗首頁
          </Link>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">基礎加強</h2>
          <p className="mt-1 text-sm text-ink-soft">
            補托福考前易混單字、搭配與短文填空。題庫共 {bank.total} 題（易混{' '}
            {bank.byKind.confusable} · 搭配 {bank.byKind.collocation} · 短文 {bank.byKind.passage}
            ）。進度獨立，不影響今日單字掌握數。
          </p>
        </section>

        <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap gap-3 text-sm">
            <StatPill label="到期錯題" value={dueDrillCount} highlight={dueDrillCount > 0} />
            <StatPill label="已練題型" value={`${drillSummary.touched}/${drillSummary.total}`} />
            <StatPill
              label="加強題掌握"
              value={`${drillSummary.mastered}/${drillSummary.total}`}
            />
            {drillStats.attempted > 0 ? (
              <StatPill
                label="累計正確率"
                value={`${Math.round((drillStats.correct / drillStats.attempted) * 100)}%`}
              />
            ) : null}
          </div>
        </section>

        <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
          <h3 className="font-medium text-ink">練習模式</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id)
                  setTheme('all')
                }}
                className={`rounded-2xl px-4 py-3 text-left transition ${
                  mode === m.id
                    ? 'bg-tide text-white shadow-sm'
                    : 'bg-white ring-1 ring-line hover:bg-mist'
                }`}
              >
                <p className="text-sm font-medium">{m.label}</p>
                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    mode === m.id ? 'text-white/90' : 'text-ink-soft'
                  }`}
                >
                  {m.desc}
                </p>
                {m.id === 'mistakes' && dueDrillCount > 0 ? (
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                      mode === m.id ? 'bg-white/20' : 'bg-coral/15 text-coral'
                    }`}
                  >
                    {dueDrillCount} 題待複習
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {themeOptions.length > 1 ? (
            <div className="mt-5">
              <p className="text-sm font-medium text-ink">主題</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {themeOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      theme === t.id
                        ? 'bg-tide/15 text-tide ring-1 ring-tide/30'
                        : 'bg-white text-ink-soft ring-1 ring-line'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {modeMeta ? (
            <p className="mt-4 rounded-xl bg-mist/80 px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
              {modeMeta.desc}
            </p>
          ) : null}

          <button
            type="button"
            onClick={start}
            className="mt-6 w-full rounded-2xl bg-tide px-4 py-3.5 text-base font-medium text-white transition hover:bg-tide-deep"
          >
            開始 {Math.min(8, bank.total)} 題
          </button>
        </section>

        <section className="animate-fade-up stagger-3 rounded-2xl border border-dashed border-line/80 bg-white/50 px-4 py-3 text-xs leading-relaxed text-ink-soft">
          <p className="font-medium text-ink">與主線學習的關係</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>今日單字排程、已掌握進度條 — 維持不變</li>
            <li>加強題答錯 → 只進「錯題複習」佇列，隔幾天再出</li>
            <li>建議：主線卡完後，用 5–10 分鐘做一輪加強即可</li>
          </ul>
        </section>
      </div>
    )
  }

  if (finished) {
    const total = questions.length
    const pct = total ? Math.round((correctCount / total) * 100) : 0
    return (
      <section className="surface soft-shadow animate-fade-up mx-auto max-w-lg rounded-3xl p-6 text-center sm:p-8">
        <p className="text-sm text-tide">基礎加強 · 本回結果</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-ink">
          {correctCount} / {total}
        </h2>
        <p className="mt-2 text-ink-soft">正確率 {pct}%</p>
        {correctCount < total ? (
          <p className="mt-3 text-sm text-ink-soft">
            錯題已加入「錯題複習」佇列，不影響單字卡進度。
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={start}
            className="rounded-2xl bg-tide px-5 py-3 text-white hover:bg-tide-deep"
          >
            再練一回
          </button>
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="rounded-2xl bg-white px-5 py-3 text-ink ring-1 ring-line"
          >
            換模式
          </button>
        </div>
      </section>
    )
  }

  if (!question) {
    return (
      <section className="surface soft-shadow mx-auto max-w-lg rounded-3xl p-6 text-center">
        <p className="text-ink-soft">這個模式目前沒有題目。</p>
        <button
          type="button"
          onClick={() => setStarted(false)}
          className="mt-4 rounded-2xl bg-tide px-5 py-3 text-white"
        >
          換模式
        </button>
      </section>
    )
  }

  const kindLabel =
    question.kind === 'passage'
      ? '短文填空'
      : question.kind === 'collocation'
        ? '搭配'
        : '易混對照'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">基礎加強</h2>
          <p className="text-xs text-ink-soft">{modeMeta?.label}</p>
        </div>
        <span className="rounded-full bg-mist px-3 py-1 text-xs text-tide">{progressLabel}</span>
      </div>

      <article className="surface soft-shadow animate-fade-up rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-tide/10 px-3 py-1 text-xs font-medium text-tide">
            {kindLabel}
          </span>
          <span className="rounded-full bg-mist px-3 py-1 text-xs text-ink-soft">
            {question.theme}
          </span>
        </div>

        {question.passage ? (
          <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-mist/80 p-4 text-sm leading-relaxed text-ink">
            {question.passage}
          </div>
        ) : null}

        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">
          {question.prompt || 'Choose the best option for the blank.'}
        </p>

        <div className="mt-5 space-y-2">
          {question.options.map((opt, idx) => {
            let style = 'bg-white ring-1 ring-line hover:bg-mist'
            if (revealed) {
              if (idx === question.answer) style = 'bg-tide text-white ring-tide'
              else if (idx === selected) style = 'bg-coral/90 text-white ring-coral'
              else style = 'bg-white/60 text-ink-soft ring-1 ring-line'
            } else if (selected === idx) {
              style = 'bg-mist ring-2 ring-tide'
            }
            return (
              <button
                key={opt}
                type="button"
                disabled={revealed}
                onClick={() => choose(idx)}
                className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${style}`}
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
              {selected === question.answer ? '答對了！' : '記這個區別'}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {question.explanation}
            </p>
            {question.passageZh ? (
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/90 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft ring-1 ring-line/40">
                <span className="font-medium text-tide">短文中文：</span>
                {question.passageZh}
              </p>
            ) : null}
            {question.exampleZh ? (
              <p className="mt-3 rounded-xl bg-white/90 px-3.5 py-2.5 text-sm leading-relaxed text-ink ring-1 ring-line/40">
                <span className="font-medium text-tide">正解中文：</span>
                {question.exampleZh}
              </p>
            ) : null}
            {question.memoryCompare || question.memoryTip ? (
              <div className="mt-3 space-y-2 rounded-xl bg-white/80 px-3.5 py-3 text-sm ring-1 ring-line/50">
                {question.memoryCompare ? (
                  <p>
                    <span className="font-medium text-tide">對照：</span>
                    {question.memoryCompare}
                  </p>
                ) : null}
                {question.memoryTip ? (
                  <p>
                    <span className="font-medium text-tide">口訣：</span>
                    {question.memoryTip}
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="mt-4 w-full rounded-2xl bg-tide px-4 py-3 text-white hover:bg-tide-deep"
            >
              {current + 1 >= questions.length ? '看結果' : '下一題'}
            </button>
          </div>
        ) : null}
      </article>
    </div>
  )
}

function StatPill({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-xl px-3 py-2 ${
        highlight ? 'bg-coral/10 text-coral' : 'bg-mist/80 text-ink-soft'
      }`}
    >
      <p className="text-xs">{label}</p>
      <p className="font-display text-lg font-bold text-ink">{value}</p>
    </div>
  )
}
