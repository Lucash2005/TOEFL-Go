import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DAILY_QUOTA, DEFAULT_TASKS, TARGETS } from '../data/config'
import { vocabulary } from '../data/vocabulary'
import {
  clearAllReports,
  exportReportsJson,
  filterOutReported,
  loadReportedCards,
  REPORT_REASONS,
  reportCard as saveReport,
  reportedIdSet,
  unreportCard as removeReport,
} from '../utils/cardReports'
import { countDueDrills, describeDrillProgress, recordDrillResult } from '../utils/drillProgress'
import { getPlanProgress } from '../utils/planProgress'
import { addDays, applyGrade, countLearnedSince, getDueIds, isLearned, normalizeEntry } from '../utils/srs'
import { todayKey } from '../utils/storage'
import { useLocalStorage } from './useLocalStorage'

const ProgressContext = createContext(null)

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function sameIds(a = [], b = []) {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((id) => setB.has(id))
}

function catchUpPlanOptions(cardProgress) {
  const today = todayKey()
  const learnedVocab = vocabulary.filter((v) => isLearned(cardProgress[v.id], today)).length
  const weekVocabGain = countLearnedSince(
    cardProgress,
    vocabulary.map((v) => v.id),
    addDays(today, -6),
    today,
  )
  const plan = getPlanProgress({
    learnedVocab,
    quizRate: null,
    appVocab: vocabulary.length,
    weekVocabGain,
  })
  const vocabQuota = plan.behind.vocab
    ? Math.min(
        40,
        Math.max(20, Math.ceil(plan.month.vocabRemaining / Math.max(7, plan.month.daysLeft))),
      )
    : DAILY_QUOTA.vocab
  return { vocabQuota }
}

function buildDailyPlan(date, cardProgress, seedExtra = '', opts = {}) {
  const vocabQuota = opts.vocabQuota || DAILY_QUOTA.vocab
  const hiddenIds = opts.hiddenIds || new Set()
  const pool = vocabulary.filter((v) => !hiddenIds.has(v.id))
  const due = getDueIds(
    cardProgress,
    pool.map((v) => v.id),
    DAILY_QUOTA.review,
    date,
  )
  const dueSet = new Set(due)
  const fresh = shuffle(pool.filter((v) => !cardProgress[v.id] && !dueSet.has(v.id))).slice(
    0,
    vocabQuota,
  )
  const filler = shuffle(
    pool.filter((v) => !dueSet.has(v.id) && !fresh.find((f) => f.id === v.id)),
  ).slice(0, Math.max(0, vocabQuota - fresh.length))

  return {
    date,
    seedExtra,
    vocabQuota,
    vocabIds: [...fresh, ...filler].slice(0, vocabQuota).map((v) => v.id),
    reviewIds: due,
    studiedIds: [],
    practiceDone: { reading: false, listening: false, speaking: false, writing: false },
  }
}

function findCardsForAnswer(answerText = '') {
  const text = String(answerText).trim()
  if (!text) return []
  const byId = vocabulary.find((c) => c.id === text)
  if (byId) return [byId]
  const lower = text.toLowerCase()
  return vocabulary
    .filter(
      (c) =>
        c.word === text ||
        c.word?.toLowerCase() === lower ||
        (text.length >= 2 && c.meaning === text),
    )
    .slice(0, 2)
}

export function ProgressProvider({ children }) {
  const [sessionSeed] = useState(() => `${Date.now()}-${Math.random()}`)
  const [cardProgress, setCardProgress] = useLocalStorage('card-progress', {})
  const [dailyTasks, setDailyTasks] = useLocalStorage('daily-tasks', {
    date: todayKey(),
    tasks: DEFAULT_TASKS,
  })
  const [dailyPlan, setDailyPlan] = useLocalStorage('daily-plan', buildDailyPlan(todayKey(), {}))
  const [quizStats, setQuizStats] = useLocalStorage('quiz-stats', {
    attempted: 0,
    correct: 0,
    lastScore: null,
  })
  const [sectionStats, setSectionStats] = useLocalStorage('section-stats', {
    reading: 0,
    listening: 0,
    speaking: 0,
    writing: 0,
  })
  const [drillProgress, setDrillProgress] = useLocalStorage('drill-progress', {})
  const [drillStats, setDrillStats] = useLocalStorage('drill-stats', {
    attempted: 0,
    correct: 0,
    lastScore: null,
  })
  const [reportedStore, setReportedStore] = useState(() => loadReportedCards())

  useEffect(() => {
    const today = todayKey()
    if (dailyTasks.date !== today) {
      setDailyTasks({ date: today, tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })) })
    }
    if (dailyPlan.date !== today) {
      const catchUp = catchUpPlanOptions(cardProgress)
      setDailyPlan(
        buildDailyPlan(today, cardProgress, '', {
          ...catchUp,
          hiddenIds: reportedIdSet(reportedStore),
        }),
      )
    }
  }, [dailyTasks.date, dailyPlan.date, cardProgress, reportedStore, setDailyTasks, setDailyPlan])

  useEffect(() => {
    if (dailyPlan.date !== todayKey()) return
    const hidden = reportedIdSet(reportedStore)
    if (!hidden.size) return
    setDailyPlan((prev) => {
      if (prev.date !== todayKey()) return prev
      const vocabIds = (prev.vocabIds || []).filter((id) => !hidden.has(id))
      const reviewIds = (prev.reviewIds || []).filter((id) => !hidden.has(id))
      const studiedIds = (prev.studiedIds || []).filter((id) => !hidden.has(id))
      if (sameIds(prev.vocabIds, vocabIds) && sameIds(prev.reviewIds, reviewIds)) return prev
      return { ...prev, vocabIds, reviewIds, studiedIds }
    })
  }, [reportedStore, dailyPlan.date, setDailyPlan])

  useEffect(() => {
    if (dailyPlan.date !== todayKey()) return
    const live = getDueIds(
      cardProgress,
      vocabulary.filter((v) => !reportedIdSet(reportedStore).has(v.id)).map((v) => v.id),
      DAILY_QUOTA.review,
    )
    setDailyPlan((prev) => {
      if (prev.date !== todayKey()) return prev
      if (prev.reviewIds.join() === live.join()) return prev
      return { ...prev, reviewIds: live }
    })
  }, [cardProgress, dailyPlan.date, reportedStore, setDailyPlan])

  const value = useMemo(() => {
    const today = todayKey()
    const hiddenIds = reportedIdSet(reportedStore)
    const plan =
      dailyPlan.date === today
        ? dailyPlan
        : buildDailyPlan(today, cardProgress, sessionSeed, {
            ...catchUpPlanOptions(cardProgress),
            hiddenIds,
          })
    const studied = new Set(plan.studiedIds || [])
    const learnedCount = vocabulary.filter((v) => isLearned(cardProgress[v.id], today)).length
    const learningVocab = vocabulary.filter((v) => {
      const e = normalizeEntry(cardProgress[v.id], today)
      return e && e.status === 'learning'
    }).length
    const dueCount = getDueIds(
      cardProgress,
      vocabulary.map((v) => v.id),
      0,
    ).length
    const weekVocabGain = countLearnedSince(
      cardProgress,
      vocabulary.map((v) => v.id),
      addDays(today, -6),
      today,
    )

    const vocabMap = new Map(vocabulary.map((v) => [v.id, v]))
    const todayVocab = filterOutReported(
      shuffle(plan.vocabIds.map((id) => vocabMap.get(id)).filter(Boolean)),
      reportedStore,
    )
    const todayReview = filterOutReported(
      plan.reviewIds.map((id) => vocabMap.get(id)).filter(Boolean),
      reportedStore,
    )

    function markStudied(id) {
      setDailyPlan((prev) => {
        const current = prev.date === today ? prev : buildDailyPlan(today, cardProgress)
        if ((current.studiedIds || []).includes(id)) return current
        return { ...current, studiedIds: [...(current.studiedIds || []), id] }
      })
    }

    function gradeCard(id, grade) {
      setCardProgress((prev) => ({ ...prev, [id]: applyGrade(prev[id], grade, today) }))
      markStudied(id)
    }

    function getEntry(id) {
      return normalizeEntry(cardProgress[id], today)
    }

    function setCardStatus(id, status) {
      setCardProgress((prev) => {
        if (!status) {
          const next = { ...prev }
          delete next[id]
          return next
        }
        const entry = normalizeEntry(prev[id], today) || {
          status: 'learning',
          ease: 2.5,
          interval: 0,
          repetitions: 0,
          due: today,
          lapses: 0,
          lastGrade: null,
          learnedAt: null,
        }
        if (status === 'learned') {
          return {
            ...prev,
            [id]: {
              ...entry,
              status: 'learned',
              interval: Math.max(entry.interval || 0, 7),
              due: addDays(today, 7),
              learnedAt: entry.learnedAt || today,
            },
          }
        }
        return {
          ...prev,
          [id]: { ...entry, status: 'review', due: today, learnedAt: null },
        }
      })
    }

    function toggleTask(id) {
      setDailyTasks((prev) => ({
        ...prev,
        date: today,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }))
    }

    function setTaskDone(id, done = true) {
      setDailyTasks((prev) => ({
        ...prev,
        date: today,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done } : t)),
      }))
    }

    function recordPractice(section) {
      setSectionStats((prev) => ({ ...prev, [section]: (prev[section] || 0) + 1 }))
      setDailyPlan((prev) => {
        const current = prev.date === today ? prev : buildDailyPlan(today, cardProgress)
        return {
          ...current,
          practiceDone: { ...current.practiceDone, [section]: true },
        }
      })
      if (section === 'reading') setTaskDone('reading-1', true)
      if (section === 'listening') setTaskDone('listening-1', true)
      if (section === 'speaking' || section === 'writing') setTaskDone('speaking-or-writing', true)
    }

    function recordQuiz(correct, total, missedAnswers = []) {
      setQuizStats((prev) => ({
        attempted: prev.attempted + total,
        correct: prev.correct + correct,
        lastScore: { correct, total, at: new Date().toISOString() },
      }))

      if (missedAnswers.length) {
        setCardProgress((prev) => {
          const next = { ...prev }
          for (const answer of missedAnswers) {
            for (const card of findCardsForAnswer(answer)) {
              next[card.id] = applyGrade(next[card.id], 'again', today)
            }
          }
          return next
        })
      }
    }

    function recordDrillAnswer(drillId, correct) {
      setDrillProgress((prev) => recordDrillResult(prev, drillId, correct, today))
      setDrillStats((prev) => ({
        attempted: prev.attempted + 1,
        correct: prev.correct + (correct ? 1 : 0),
        lastScore: { drillId, correct, at: new Date().toISOString() },
      }))
    }

    function reshuffleTodayPlan() {
      const catchUp = catchUpPlanOptions(cardProgress)
      setDailyPlan(
        buildDailyPlan(today, cardProgress, `reshuffle:${Date.now()}`, {
          ...catchUp,
          hiddenIds,
        }),
      )
      setDailyTasks({ date: today, tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })) })
    }

    function catchUpTodayPlan() {
      const catchUp = catchUpPlanOptions(cardProgress)
      setDailyPlan(
        buildDailyPlan(today, cardProgress, `catch-up:${Date.now()}`, {
          ...catchUp,
          hiddenIds,
        }),
      )
    }

    function reportCardIssue(card, reasonIds, note = '') {
      if (!card?.id) return
      setReportedStore(saveReport(card, reasonIds, note, reportedStore))
    }

    function unreportCardIssue(id) {
      if (!id) return
      setReportedStore(removeReport(id, reportedStore))
    }

    function clearCardReports() {
      setReportedStore(clearAllReports())
    }

    function copyReportsExport() {
      const text = exportReportsJson(reportedStore)
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).then(() => text)
      }
      return Promise.resolve(text)
    }

    const vocabStudied = plan.vocabIds.filter((id) => studied.has(id)).length
    const reviewStudied = plan.reviewIds.filter((id) => studied.has(id)).length
    const dueDrillCount = countDueDrills(drillProgress, today)
    const drillSummary = describeDrillProgress(drillProgress, today)
    const reportedItems = Object.values(reportedStore.items || {})

    return {
      cardProgress,
      gradeCard,
      getEntry,
      setCardStatus,
      dailyTasks: dailyTasks.tasks,
      toggleTask,
      setTaskDone,
      quizStats,
      recordQuiz,
      sectionStats,
      recordPractice,
      learnedCount,
      learningVocab,
      weekVocabGain,
      dueCount,
      targets: TARGETS,
      totalVocab: vocabulary.length,
      todayVocab,
      todayReview,
      vocabStudied,
      reviewStudied,
      isStudied: (id) => studied.has(id),
      markStudied,
      reshuffleTodayPlan,
      catchUpTodayPlan,
      practiceDone: plan.practiceDone || {},
      dailyPlan: plan,
      drillProgress,
      drillStats,
      dueDrillCount,
      drillSummary,
      recordDrillAnswer,
      reportCardIssue,
      unreportCardIssue,
      clearCardReports,
      copyReportsExport,
      reportedItems,
      reportedCount: reportedItems.length,
      reportReasons: REPORT_REASONS,
      isCardReported: (id) => Boolean(id && reportedStore.items?.[id]),
    }
  }, [
    cardProgress,
    dailyTasks,
    dailyPlan,
    quizStats,
    sectionStats,
    drillProgress,
    drillStats,
    reportedStore,
    sessionSeed,
    setCardProgress,
    setDailyTasks,
    setDailyPlan,
    setQuizStats,
    setSectionStats,
    setDrillProgress,
    setDrillStats,
  ])

  useEffect(() => {
    const today = todayKey()
    if (dailyPlan.date !== today) return
    const studied = new Set(dailyPlan.studiedIds || [])
    const vocabDone =
      dailyPlan.vocabIds?.length > 0 && dailyPlan.vocabIds.every((id) => studied.has(id))
    if (!vocabDone) return
    setDailyTasks((prev) => {
      if (prev.date !== today) return prev
      const task = prev.tasks.find((t) => t.id === 'vocab-20')
      if (!task || task.done) return prev
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === 'vocab-20' ? { ...t, done: true } : t)),
      }
    })
  }, [dailyPlan, setDailyTasks])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
