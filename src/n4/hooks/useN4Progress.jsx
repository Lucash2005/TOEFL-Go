import { createContext, useContext, useEffect, useMemo } from 'react'
import { DEFAULT_TASKS, TARGETS } from '../data/config'
import { grammar } from '../data/grammar'
import { vocabulary } from '../data/vocabulary'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { N4_PREFIX, todayKey } from '../../utils/storage'

const N4ProgressContext = createContext(null)

export function N4ProgressProvider({ children }) {
  const [cardProgress, setCardProgress] = useLocalStorage('card-progress', {}, N4_PREFIX)
  const [dailyTasks, setDailyTasks] = useLocalStorage(
    'daily-tasks',
    { date: todayKey(), tasks: DEFAULT_TASKS },
    N4_PREFIX,
  )
  const [quizStats, setQuizStats] = useLocalStorage(
    'quiz-stats',
    { attempted: 0, correct: 0, lastScore: null },
    N4_PREFIX,
  )

  useEffect(() => {
    if (dailyTasks.date !== todayKey()) {
      setDailyTasks({
        date: todayKey(),
        tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      })
    }
  }, [dailyTasks.date, setDailyTasks])

  const value = useMemo(() => {
    const learnedVocab = vocabulary.filter((v) => cardProgress[v.id] === 'learned').length
    const learnedGrammar = grammar.filter((g) => cardProgress[g.id] === 'learned').length
    const reviewCount = Object.values(cardProgress).filter((s) => s === 'review').length

    function setCardStatus(id, status) {
      setCardProgress((prev) => {
        const next = { ...prev }
        if (!status) delete next[id]
        else next[id] = status
        return next
      })
    }

    function toggleTask(id) {
      setDailyTasks((prev) => ({
        ...prev,
        date: todayKey(),
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }))
    }

    function recordQuiz(correct, total) {
      setQuizStats((prev) => ({
        attempted: prev.attempted + total,
        correct: prev.correct + correct,
        lastScore: { correct, total, at: new Date().toISOString() },
      }))
    }

    return {
      cardProgress,
      setCardStatus,
      dailyTasks: dailyTasks.tasks,
      toggleTask,
      quizStats,
      recordQuiz,
      learnedVocab,
      learnedGrammar,
      reviewCount,
      targets: TARGETS,
      totalVocabInApp: vocabulary.length,
      totalGrammarInApp: grammar.length,
    }
  }, [cardProgress, dailyTasks, quizStats, setCardProgress, setDailyTasks, setQuizStats])

  return <N4ProgressContext.Provider value={value}>{children}</N4ProgressContext.Provider>
}

export function useN4Progress() {
  const ctx = useContext(N4ProgressContext)
  if (!ctx) throw new Error('useN4Progress must be used within N4ProgressProvider')
  return ctx
}
