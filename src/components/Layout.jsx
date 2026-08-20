import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '今日', end: true, icon: HomeIcon },
  { to: '/vocab', label: '單字', icon: CardIcon },
  { to: '/practice', label: '練習', icon: PracticeIcon },
  { to: '/quiz', label: '測驗', icon: QuizIcon },
  { to: '/plan', label: '計畫', icon: CalendarIcon },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-28 pt-6 sm:px-5">
      <header className="animate-fade-up mb-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber uppercase">TOEFL Prep</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          TOEFL Go
        </h1>
        <p className="mt-1 text-sm text-ink-soft">四大科練習 · 單字 SRS · Neural 發音</p>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line/80 bg-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
        aria-label="主要導覽"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `touch-target flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition ${
                    isActive ? 'bg-tide text-white' : 'text-ink-soft hover:bg-mist'
                  }`
                }
              >
                <link.icon />
                <span>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 3h8a2 2 0 0 1 2 2v12" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function PracticeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 19V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function QuizIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.2 9.4a2.8 2.8 0 1 1 4.3 2.4c-.8.5-1.5 1.1-1.5 2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.8" r="1" fill="currentColor" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 9.5h17M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
