import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const toeflLinks = [
  { to: '/', label: '今日', end: true },
  { to: '/vocab', label: '單字' },
  { to: '/practice', label: '練習' },
  { to: '/quiz', label: '測驗' },
  { to: '/plan', label: '計畫' },
]

const n4Links = [
  { to: '/n4', label: '今日', end: true },
  { to: '/n4/flashcards', label: '卡片' },
  { to: '/n4/quiz', label: '測驗' },
  { to: '/n4/schedule', label: '計畫' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isN4 = location.pathname === '/n4' || location.pathname.startsWith('/n4/')
  const links = isN4 ? n4Links : toeflLinks

  useEffect(() => {
    document.documentElement.classList.toggle('theme-n4', isN4)
    return () => document.documentElement.classList.remove('theme-n4')
  }, [isN4])

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-24 pt-6 sm:px-5">
      <header className="animate-fade-up mb-5">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white/70 p-1 ring-1 ring-line/70">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              isN4 ? 'text-ink-soft hover:bg-mist' : 'bg-tide text-white'
            }`}
          >
            TOEFL
          </button>
          <button
            type="button"
            onClick={() => navigate('/n4')}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              isN4 ? 'bg-sea text-white' : 'text-ink-soft hover:bg-mist'
            }`}
          >
            日檢 N4
          </button>
        </div>

        {isN4 ? (
          <>
            <p className="text-xs font-semibold tracking-[0.2em] text-sea-deep">JLPT N4</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              N4 Go
            </h1>
            <p className="mt-1 text-sm text-ink-soft">單字／文法卡片 · 模擬測驗 · 12 月計畫</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber uppercase">TOEFL Prep</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              TOEFL Go
            </h1>
            <p className="mt-1 text-sm text-ink-soft">四大科練習 · 單字 SRS · 每日節奏</p>
          </>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line/80 bg-paper/95 backdrop-blur">
        <ul
          className={`mx-auto grid max-w-lg gap-1 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${
            isN4 ? 'grid-cols-4' : 'grid-cols-5'
          }`}
        >
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex touch-target items-center justify-center rounded-xl px-1 text-sm font-medium transition ${
                    isActive
                      ? isN4
                        ? 'bg-sea text-white'
                        : 'bg-tide text-white'
                      : 'text-ink-soft hover:bg-mist'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
