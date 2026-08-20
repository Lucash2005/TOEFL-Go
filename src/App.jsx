import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ProgressProvider } from './hooks/useProgress'
import { N4ProgressProvider } from './n4/hooks/useN4Progress'
import Dashboard from './pages/Dashboard'
import Vocab from './pages/Vocab'
import Practice from './pages/Practice'
import Quiz from './pages/Quiz'
import Plan from './pages/Plan'

const N4Dashboard = lazy(() => import('./n4/pages/Dashboard'))
const N4Flashcards = lazy(() => import('./n4/pages/Flashcards'))
const N4Quiz = lazy(() => import('./n4/pages/Quiz'))
const N4Schedule = lazy(() => import('./n4/pages/Schedule'))

function Fallback() {
  return <p className="text-sm text-ink-soft">載入中…</p>
}

export default function App() {
  return (
    <ProgressProvider>
      <N4ProgressProvider>
        <HashRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="vocab" element={<Vocab />} />
                <Route path="practice" element={<Practice />} />
                <Route path="quiz" element={<Quiz />} />
                <Route path="plan" element={<Plan />} />
                <Route path="n4" element={<N4Dashboard />} />
                <Route path="n4/flashcards" element={<N4Flashcards />} />
                <Route path="n4/quiz" element={<N4Quiz />} />
                <Route path="n4/schedule" element={<N4Schedule />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </N4ProgressProvider>
    </ProgressProvider>
  )
}
