import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { phases } from '../data/schedule'
import { EXAM_DATE } from '../data/config'
import { useProgress } from '../hooks/useProgress'
import { getPlanProgress } from '../utils/planProgress'

export default function Plan() {
  const { learnedCount, quizStats, totalVocab, weekVocabGain } = useProgress()
  const quizRate =
    quizStats.attempted > 0 ? Math.round((quizStats.correct / quizStats.attempted) * 100) : null
  const plan = getPlanProgress({
    learnedVocab: learnedCount,
    quizRate,
    appVocab: totalVocab,
    weekVocabGain,
  })
  const statusLabel =
    plan.severity === 'ok' ? '進度正常' : plan.severity === 'mid' ? '略為落後' : '明顯落後'
  const statusClass =
    plan.severity === 'ok'
      ? 'bg-tide/15 text-tide'
      : plan.severity === 'mid'
        ? 'bg-mist text-ink'
        : 'bg-coral/15 text-coral'

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">學習計畫</h2>
        <p className="mt-1 text-sm text-ink-soft">
          目標考試日：{EXAM_DATE.toLocaleDateString('zh-TW')} · 依階段推進，不必一次做完全部
        </p>
      </section>

      <section className="surface soft-shadow animate-fade-up rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">計畫進度對照</h3>
            <p className="mt-1 text-sm text-ink-soft">
              本月重點：{plan.currentMilestone?.label} · {plan.currentMilestone?.target}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <ProgressBar
            label="已掌握單字"
            value={plan.actual.vocab}
            target={plan.final.vocabTarget}
            hint={`本月目標 ${plan.month.vocabTarget} · 還差 ${plan.month.vocabRemaining} · 近 7 日 +${weekVocabGain}`}
          />
          <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-line/50">
            <div className="flex items-end justify-between gap-2">
              <p className="text-sm font-medium text-ink">測驗累計正確率</p>
              <p className="text-xs text-ink-soft">
                {plan.actual.quizRate == null
                  ? '尚未測驗'
                  : `${plan.actual.quizRate}%${
                      plan.expected.quizRate != null ? `／目標約 ${plan.expected.quizRate}%` : ''
                    }`}
              </p>
            </div>
            {plan.behind.quiz ? (
              <p className="mt-2 text-xs text-coral">正確率偏低，建議本週多做 2～3 回測驗。</p>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">距離考試還有 {plan.daysToExam} 天</p>
            )}
          </div>
        </div>
      </section>

      <section className="surface soft-shadow animate-fade-up rounded-3xl p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold text-ink">
          {plan.severity === 'ok' ? '建議維持' : '補救措施'}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          {plan.severity === 'ok' ? '照今日排程走即可' : '先補落後科目，再恢復一般節奏'}
        </p>
        <ul className="mt-4 space-y-3">
          {plan.remedies.map((item) => (
            <li key={item.title} className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
              <p className="font-medium text-ink">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.detail}</p>
              {item.to ? (
                <Link
                  to={item.to}
                  className="mt-3 inline-flex rounded-xl bg-tide px-3 py-2 text-sm text-white hover:bg-tide-deep"
                >
                  {item.cta} →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        {phases.map((phase, i) => (
          <article
            key={phase.id}
            className="surface soft-shadow animate-fade-up rounded-3xl p-5"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tide/10 font-display text-sm font-bold text-tide">
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-amber uppercase">
                  {phase.month}
                </p>
                <h3 className="font-display mt-1 text-xl font-bold text-ink">{phase.title}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  {phase.goals.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="surface rounded-3xl p-5">
        <h3 className="font-display text-lg font-bold text-ink">每天最低標</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
          <li>單字 SRS 評分（想得出意思再按「記得」）</li>
          <li>閱讀或聽力擇一短練</li>
          <li>口說計時 1 題，或寫作打一段大綱</li>
        </ol>
      </section>
    </div>
  )
}
