import { EXAM_DATE, TARGETS } from '../data/config'
import { monthlyMilestones } from '../data/schedule'

/** @param {Date} [now] */
export function monthKey(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Honest plan progress: month-end + final targets matter more than
 * a daily "you should have N by today" line that always feels behind.
 *
 * @param {{
 *   learnedVocab: number,
 *   quizRate: number | null,
 *   appVocab: number,
 *   weekVocabGain?: number,
 * }} stats
 * @param {Date} [now]
 */
export function getPlanProgress(stats, now = new Date()) {
  const points = monthlyMilestones.map((m) => ({
    key: m.month,
    date: parseMonthEnd(m.month),
    vocab: m.vocabTarget,
    quizRate: m.quizRateTarget,
  }))

  const start = {
    key: '2026-07',
    date: new Date('2026-07-31T23:59:59+08:00'),
    vocab: 0,
    quizRate: null,
  }
  const series = [start, ...points]

  const expected = interpolateAt(series, now)
  const currentKey = monthKey(now)
  const currentMilestone =
    monthlyMilestones.find((m) => m.month === currentKey) ||
    monthlyMilestones.find((m) => m.month > currentKey) ||
    monthlyMilestones[monthlyMilestones.length - 1]

  const prevMilestone =
    [...monthlyMilestones].reverse().find((m) => m.month < currentKey) || null

  const vocabExpected = Math.round(expected.vocab)
  const vocabCap = Math.min(TARGETS.vocabulary, stats.appVocab)
  const monthVocabTarget = currentMilestone?.vocabTarget ?? TARGETS.vocabulary
  const vocabToMonth = Math.max(0, monthVocabTarget - stats.learnedVocab)
  const vocabToFinal = Math.max(0, TARGETS.vocabulary - stats.learnedVocab)

  const daysToExam = Math.max(0, Math.ceil((EXAM_DATE.getTime() - now.getTime()) / 86400000))
  const daysLeftInMonth = daysUntilMonthEnd(now)

  const weekVocabGain = Math.max(0, stats.weekVocabGain || 0)
  const dailyVocabPace = weekVocabGain / 7
  const projectedMonthVocab = stats.learnedVocab + dailyVocabPace * daysLeftInMonth

  const vocabBehind =
    vocabToMonth > 0 &&
    (dailyVocabPace < 0.2
      ? vocabToMonth > Math.max(20, daysLeftInMonth * 8)
      : projectedMonthVocab < monthVocabTarget * 0.85)

  const quizBehind =
    expected.quizRate != null &&
    stats.quizRate != null &&
    stats.quizRate < expected.quizRate - 10

  const severity = vocabBehind ? (vocabToMonth > 150 ? 'high' : 'mid') : 'ok'

  const daysToMonthVocab =
    dailyVocabPace >= 0.5 ? Math.ceil(vocabToMonth / dailyVocabPace) : null
  const daysToFinalVocab =
    dailyVocabPace >= 0.5 ? Math.ceil(vocabToFinal / dailyVocabPace) : null

  const vocabGapForCatchUp = Math.max(vocabToMonth, vocabExpected - stats.learnedVocab)

  return {
    currentKey,
    currentMilestone,
    prevMilestone,
    expected: {
      vocab: vocabExpected,
      quizRate: expected.quizRate,
    },
    actual: {
      vocab: stats.learnedVocab,
      quizRate: stats.quizRate,
    },
    gap: {
      vocab: vocabExpected - stats.learnedVocab,
      quizRate:
        expected.quizRate != null && stats.quizRate != null
          ? expected.quizRate - stats.quizRate
          : null,
    },
    month: {
      vocabTarget: monthVocabTarget,
      vocabRemaining: vocabToMonth,
      daysLeft: daysLeftInMonth,
    },
    final: {
      vocabTarget: TARGETS.vocabulary,
      vocabRemaining: vocabToFinal,
    },
    momentum: {
      weekVocabGain,
      dailyVocabPace: Math.round(dailyVocabPace * 10) / 10,
      daysToMonthVocab,
      daysToFinalVocab,
      projectedMonthVocab: Math.round(projectedMonthVocab),
    },
    caps: { vocab: vocabCap },
    behind: { vocab: vocabBehind, quiz: Boolean(quizBehind) },
    severity,
    daysToExam,
    remedies: buildRemedies({
      severity,
      vocabBehind,
      quizBehind: Boolean(quizBehind),
      vocabGap: vocabGapForCatchUp,
      daysToExam,
      appVocab: stats.appVocab,
      learnedVocab: stats.learnedVocab,
      daysToMonthVocab,
      weekVocabGain,
    }),
  }
}

function parseMonthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0, 23, 59, 59)
}

function daysUntilMonthEnd(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86400000))
}

function interpolateAt(series, now) {
  if (now <= series[0].date) return { vocab: 0, quizRate: null }
  for (let i = 1; i < series.length; i += 1) {
    const a = series[i - 1]
    const b = series[i]
    if (now <= b.date) {
      const span = b.date.getTime() - a.date.getTime()
      const t = span <= 0 ? 1 : (now.getTime() - a.date.getTime()) / span
      const quizRate =
        b.quizRate == null
          ? a.quizRate
          : a.quizRate == null
            ? b.quizRate * t
            : a.quizRate + (b.quizRate - a.quizRate) * t
      return {
        vocab: a.vocab + (b.vocab - a.vocab) * t,
        quizRate: quizRate == null ? null : Math.round(quizRate),
      }
    }
  }
  const last = series[series.length - 1]
  return { vocab: last.vocab, quizRate: last.quizRate }
}

function buildRemedies({
  severity,
  vocabBehind,
  quizBehind,
  vocabGap,
  daysToExam,
  appVocab,
  learnedVocab,
  daysToMonthVocab,
  weekVocabGain,
}) {
  if (severity === 'ok') {
    return [
      {
        title: '節奏可用，繼續往前',
        detail:
          weekVocabGain > 0
            ? `近 7 日新掌握 ${weekVocabGain} 字。維持每日評分＋到期複習＋四大科短練即可。`
            : '每日完成單字評分＋閱讀或聽力擇一，週末做一回測驗。',
        to: '/',
        cta: '回今日排程',
      },
    ]
  }

  const items = []

  if (vocabBehind) {
    const daily = Math.min(
      40,
      Math.max(20, Math.ceil(vocabGap / Math.max(7, Math.floor(daysToExam / 8)))),
    )
    items.push({
      title: `單字加速：今天可手動加量至約 ${daily} 個`,
      detail:
        learnedVocab >= appVocab
          ? `App 內 ${appVocab} 字已幾乎學完；請優先清 SRS 到期。`
          : `還差約 ${Math.max(0, Math.round(vocabGap))} 才到本月目標。近一週有前進就會反映在預估天數上。`,
      to: '/vocab?mode=today',
      cta: '開始單字',
    })
    items.push({
      title: '先清到期複習',
      detail:
        daysToMonthVocab != null
          ? `依近一週速度，約 ${daysToMonthVocab} 天可到本月單字目標。清完到期再加新字最有效。`
          : '到期卡仍算已掌握；清完再加新字，每週數字才會往上走。',
      to: '/vocab?mode=review',
      cta: '開始複習',
    })
  }

  if (quizBehind || severity === 'high') {
    items.push({
      title: '每週至少 3 回測驗',
      detail: '答錯的單字會進複習佇列。先練綜合，再用基礎加強補易混對照。',
      to: '/quiz',
      cta: '去做測驗',
    })
  }

  items.push({
    title: '四大科短練',
    detail: '閱讀或聽力擇一短練，口說計時 1 題或寫作打一段大綱。',
    to: '/practice',
    cta: '去練習',
  })

  items.push({
    title: '週末補課（單字聽力循環）',
    detail: '用 Neural 音檔循環今日單字＋例句，鎖屏也可繼續。',
    to: '/vocab?mode=listen',
    cta: '開始聽力',
  })

  return items
}
