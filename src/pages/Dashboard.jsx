import { Link } from 'react-router-dom'
import { useState } from 'react'
import Countdown from '../components/Countdown'
import ProgressBar from '../components/ProgressBar'
import { DRILL_BANK_SIZE } from '../data/drill'
import { useProgress } from '../hooks/useProgress'
import { getPlanProgress } from '../utils/planProgress'

export default function Dashboard() {
  const {
    dailyTasks,
    toggleTask,
    learnedCount,
    learningVocab,
    weekVocabGain,
    dueCount,
    targets,
    totalVocab,
    todayVocab,
    todayThemeLabel,
    todayReview,
    isStudied,
    vocabStudied,
    reviewStudied,
    sectionStats,
    quizStats,
    reshuffleTodayPlan,
    catchUpTodayPlan,
    practiceDone,
    dueDrillCount,
    reportedCount,
    reportedItems,
    clearCardReports,
    copyReportsExport,
    unreportCardIssue,
  } = useProgress()
  const [exportMsg, setExportMsg] = useState('')

  const doneCount = dailyTasks.filter((t) => t.done).length
  const quizRate =
    quizStats.attempted > 0 ? Math.round((quizStats.correct / quizStats.attempted) * 100) : null
  const plan = getPlanProgress({
    learnedVocab: learnedCount,
    quizRate,
    appVocab: totalVocab,
    weekVocabGain,
  })
  const planStatus =
    plan.severity === 'ok' ? '節奏可用' : plan.severity === 'mid' ? '需加快' : '需加量追'
  const planTone =
    plan.severity === 'ok'
      ? 'bg-tide/15 text-tide'
      : plan.severity === 'mid'
        ? 'bg-mist text-ink'
        : 'bg-coral/15 text-coral'

  return (
    <div className="space-y-5">
      <Countdown />

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">往目標前進</h2>
            <p className="mt-1 text-sm text-ink-soft">
              看本月／總目標與近一週實際前進 · {plan.currentMilestone?.label || '衝刺月'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${planTone}`}>
            {planStatus}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <ProgressBar
            label={`本月單字（${plan.currentMilestone?.label || ''}目標）`}
            value={learnedCount}
            target={plan.month.vocabTarget}
            hint={
              plan.momentum.daysToMonthVocab != null
                ? `還差 ${plan.month.vocabRemaining} · 依近 7 日速度約 ${plan.momentum.daysToMonthVocab} 天可到`
                : `還差 ${plan.month.vocabRemaining} · 近 7 日新掌握 ${weekVocabGain}（開始評分後會算出預估）`
            }
          />
          <ProgressBar
            label="托福單字總目標"
            value={learnedCount}
            target={plan.final.vocabTarget}
            hint={
              plan.momentum.daysToFinalVocab != null
                ? `還差 ${plan.final.vocabRemaining} · 約 ${plan.momentum.daysToFinalVocab} 天（近 7 日均速 ${plan.momentum.dailyVocabPace}/天）`
                : `還差 ${plan.final.vocabRemaining} · 學習中 ${learningVocab}`
            }
          />
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl bg-mist/70 p-3 text-sm text-ink-soft sm:grid-cols-2">
          <p>
            近 7 日新掌握單字 <span className="font-semibold text-tide">{weekVocabGain}</span>
          </p>
          <p>
            考試還有 <span className="font-semibold text-ink">{plan.daysToExam}</span> 天
          </p>
        </div>

        <p className="mt-3 text-xs text-ink-soft">
          到期複習不會扣掉已掌握。動力看「本週有沒有 +N」與「離本月目標還多近」。
          {todayVocab.length > 20 ? ` 今天已加量至 ${todayVocab.length} 個單字。` : ''}
        </p>
        <Link
          to="/plan"
          className="mt-4 inline-flex rounded-xl bg-tide px-4 py-2.5 text-sm text-white hover:bg-tide-deep"
        >
          看補救措施 →
        </Link>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">今日節奏</h2>
            <p className="mt-1 text-sm text-ink-soft">
              今日單字優先抽同一主題
              {todayThemeLabel ? `（${todayThemeLabel}）` : ''}，方便一起記
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={catchUpTodayPlan}
              className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-mist"
              title="落後時手動加量至建議字數（會重抽今日單字）"
            >
              手動加量
            </button>
            <button
              type="button"
              onClick={reshuffleTodayPlan}
              className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-mist"
            >
              重新抽題
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <PlanLink
            title="今日單字"
            progress={`${vocabStudied}/${todayVocab.length}`}
            to="/vocab?mode=today"
            cta="開始 SRS"
            items={todayVocab}
            isStudied={isStudied}
            note={todayThemeLabel ? `主題：${todayThemeLabel}` : ''}
          />
          <PlanLink
            title="到期複習"
            progress={`${reviewStudied}/${todayReview.length}`}
            to="/vocab?mode=review"
            cta="開始複習"
            empty={!todayReview.length}
            emptyText="目前沒有到期單字"
          />
          <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">單字聽力循環</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Neural 播放今日單字、中文詞義、例句與例句翻譯，鎖屏後也可繼續
                </p>
              </div>
              <Link
                to="/vocab?mode=listen"
                className="rounded-xl bg-tide px-3 py-2 text-sm text-white hover:bg-tide-deep"
              >
                開始聽力
              </Link>
            </div>
          </div>
          <PlanLink
            title="閱讀／聽力／口說／寫作"
            progress={
              ['reading', 'listening', 'speaking', 'writing'].filter((k) => practiceDone[k])
                .length + '/4 科已練'
            }
            to="/practice"
            cta="去練習"
          />
          <div className="rounded-2xl bg-coral/5 p-4 ring-1 ring-coral/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">基礎加強（選修）</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  易混單字／搭配／填空 · 題庫 {DRILL_BANK_SIZE} 題 · 錯題獨立複習
                  {dueDrillCount > 0 ? ` · ${dueDrillCount} 題待複習` : ''}
                </p>
              </div>
              <Link
                to="/drill"
                className="rounded-xl bg-coral px-3 py-2 text-sm text-white hover:bg-coral/90"
              >
                開始加強
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">整體進度</h2>
            <p className="mt-1 text-sm text-ink-soft">先把節奏做穩，再拉長模考</p>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-xs text-tide">到期 {dueCount}</span>
        </div>
        <div className="space-y-4">
          <ProgressBar
            label="已掌握單字"
            value={learnedCount}
            target={targets.vocabulary}
            hint={`題庫 ${totalVocab} 字，已對齊目標 ${targets.vocabulary}`}
          />
          <ProgressBar label="閱讀完成篇數" value={sectionStats.reading} target={targets.reading} />
          <ProgressBar
            label="聽力完成題組"
            value={sectionStats.listening}
            target={targets.listening}
          />
          <ProgressBar
            label="口說完成題"
            value={sectionStats.speaking}
            target={targets.speaking}
          />
          <ProgressBar
            label="寫作完成題"
            value={sectionStats.writing}
            target={targets.writing}
          />
        </div>
        {quizStats.lastScore ? (
          <p className="mt-4 text-xs text-ink-soft">
            最近測驗：{quizStats.lastScore.correct}/{quizStats.lastScore.total} · 累計答對{' '}
            {quizStats.correct}/{quizStats.attempted || 0}
          </p>
        ) : (
          <p className="mt-4 text-xs text-ink-soft">尚未進行測驗，可到「測驗」開始第一回。</p>
        )}
      </section>

      {reportedCount > 0 ? (
        <section className="surface soft-shadow animate-fade-up rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">已回報隱藏</h2>
              <p className="mt-1 text-sm text-ink-soft">
                本機暫存 {reportedCount} 張，不會再出現於練習／瀏覽；確認修正後請手動按「解除隱藏」。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await copyReportsExport()
                    setExportMsg('已複製回報清單到剪貼簿，可貼給開發者')
                  } catch {
                    setExportMsg('複製失敗，請改用瀏覽器允許剪貼簿權限')
                  }
                  window.setTimeout(() => setExportMsg(''), 3500)
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-mist"
              >
                複製回報清單
              </button>
              <button
                type="button"
                onClick={clearCardReports}
                className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-mist"
              >
                全部恢復顯示
              </button>
            </div>
          </div>
          {exportMsg ? <p className="mt-2 text-xs text-tide">{exportMsg}</p> : null}
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {(reportedItems || []).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-mist/70 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{item.word}</span>
                  <span className="ml-2 text-xs text-ink-soft">
                    {(item.reasonLabels || [item.reasonLabel]).filter(Boolean).join('、')}
                  </span>
                  {item.note ? <p className="mt-0.5 text-xs text-ink-soft">{item.note}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => unreportCardIssue(item.id)}
                  className="text-xs text-tide underline-offset-2 hover:underline"
                >
                  恢復
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="surface soft-shadow animate-fade-up stagger-3 rounded-3xl p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-ink">今日任務</h2>
        <p className="mt-1 text-sm text-ink-soft">
          完成 {doneCount}/{dailyTasks.length} 項
        </p>
        <ul className="mt-4 space-y-2">
          {dailyTasks.map((task) => (
            <li key={task.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-line/50">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="size-5 accent-[var(--color-tide)]"
                />
                <span className={task.done ? 'text-ink-soft line-through' : 'text-ink'}>
                  {task.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PlanLink({ title, progress, to, cta, empty, emptyText, items, isStudied, note }) {
  return (
    <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{empty ? emptyText : `進度 ${progress}`}</p>
          {note ? <p className="mt-1 text-xs leading-relaxed text-tide">{note}</p> : null}
        </div>
        {!empty ? (
          <Link
            to={to}
            className="rounded-xl bg-tide px-3 py-2 text-sm text-white hover:bg-tide-deep"
          >
            {cta}
          </Link>
        ) : null}
      </div>
      {items?.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((card) => (
            <li
              key={card.id}
              className={`rounded-full px-2.5 py-1 text-xs ${
                isStudied?.(card.id)
                  ? 'bg-tide/15 text-tide line-through'
                  : 'bg-mist text-ink'
              }`}
            >
              {card.word}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
