import { useEffect, useState } from 'react'
import { EXAM_DATE } from '../data/config'
import { getCountdown, pad2 } from '../utils/countdown'

export default function Countdown() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { days, hours, minutes, seconds } = getCountdown(EXAM_DATE, now)

  const units = [
    { label: '天', value: days },
    { label: '時', value: pad2(hours) },
    { label: '分', value: pad2(minutes) },
    { label: '秒', value: pad2(seconds) },
  ]

  return (
    <section className="surface soft-shadow animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-amber/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 left-10 size-36 rounded-full bg-tide/15 blur-2xl" />
      <p className="relative text-xs font-semibold tracking-[0.18em] text-amber uppercase">
        Exam Countdown
      </p>
      <h2 className="font-display relative mt-1 text-2xl font-bold text-ink sm:text-3xl">
        距離目標考試
      </h2>
      <div className="relative mt-5 grid grid-cols-4 gap-2 sm:gap-3">
        {units.map((u, i) => (
          <div
            key={u.label}
            className={`animate-fade-up stagger-${i + 1} rounded-2xl bg-white/80 px-2 py-3 text-center ring-1 ring-line/60`}
          >
            <div className="font-display text-2xl font-bold tabular-nums text-tide sm:text-3xl">
              {u.value}
            </div>
            <div className="mt-1 text-xs text-ink-soft">{u.label}</div>
          </div>
        ))}
      </div>
      <p className="relative mt-3 text-xs text-ink-soft">
        預設目標日：{EXAM_DATE.toLocaleDateString('zh-TW')}（可在程式設定調整）
      </p>
    </section>
  )
}
