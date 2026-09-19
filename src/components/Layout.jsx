import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import { isDemoMode } from '../lib/api.js'
import Sparkle from './Sparkle.jsx'
import PoweredBy from './PoweredBy.jsx'

/**
 * The bottom bar is a thumb-reach surface, and thumbs do not get wider when the
 * app grows. Seven items wrapped it onto two rows, so it is split by where you
 * are when you need each one.
 *
 * PRIMARY is what you touch standing in a shop with one hand on a packet.
 * MORE is what you open sitting at home, and it lives behind a round button
 * rather than a dropdown — a menu that opens upward would cover the verdict you
 * are reading, which is the one thing this bar must never do.
 *
 * The sidebar on desktop has room for all of it and still shows everything.
 */
const PRIMARY = [
  { to: '/', label: 'Home', end: true, icon: HomeIcon },
  { to: '/scan', label: 'Scan', icon: ScanIcon },
  { to: '/check', label: 'Claim check', icon: ClaimIcon },
  { to: '/family', label: 'Family', icon: FamilyIcon },
]

const MORE = [
  { to: '/safe', label: 'Safe list', icon: SafeIcon },
  { to: '/ask', label: 'Ask', icon: AskIcon },
  { to: '/report', label: 'Report', icon: ReportIcon },
]

const NAV = [...PRIMARY, ...MORE]

export default function Layout() {
  const { listFor, activeId, family } = usePalat()
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const moreBtn = useRef(null)

  const badgeFor = (to) => {
    if (to === '/safe') { const n = listFor(activeId).length; return n || null }
    if (to === '/family' && family.length) return family.length
    return null
  }

  // Anything hidden behind the button still has to be able to shout.
  const hiddenBadge = MORE.some((item) => badgeFor(item.to))
  const moreActive = MORE.some((item) => location.pathname === item.to)

  // Navigating is the end of the menu's job.
  useEffect(() => setMoreOpen(false), [location.pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false)
        moreBtn.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  return (
    <div className="shell">
      <aside className="nav">
        <NavLink to="/" className="nav-brand">
          <Sparkle size={26} />
          <span>Palat</span>
        </NavLink>
        <p className="nav-tagline">
          Flip the packet. Photograph the back. Get one answer for the person
          who's actually eating it.
        </p>

        <nav className="nav-links">
          {NAV.map(({ to, label, end, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon />
              <span>{label}</span>
              {badgeFor(to) ? <span className="nav-badge">{badgeFor(to)}</span> : null}
            </NavLink>
          ))}
        </nav>

        <p className="nav-note">
          Gemini reads the label, the nutrition table and the plate. It never
          diagnoses — anything medical goes to a doctor.
        </p>

        <PoweredBy />
      </aside>

      <main className="main">
        {isDemoMode() ? (
          <p className="demo-banner">
            Demo mode — frozen readings, Gemini is not being called.
          </p>
        ) : null}
        <Outlet />
        <PoweredBy className="powered--foot" />
      </main>

      {moreOpen ? (
        <div
          className="moresheet-scrim"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <nav className="tabbar">
        {PRIMARY.map(({ to, label, end, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className="tabbar-link">
            <span className="tabbar-icon">
              <Icon />
              {badgeFor(to) && to === '/safe' ? (
                <span className="tabbar-badge">{badgeFor(to)}</span>
              ) : null}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="tabbar-more">
          {moreOpen ? (
            <div className="moresheet" role="menu" aria-label="More">
              {MORE.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className="moresheet-link" role="menuitem">
                  <Icon />
                  <span>{label}</span>
                  {badgeFor(to) ? (
                    <span className="moresheet-badge">{badgeFor(to)}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ) : null}

          <button
            ref={moreBtn}
            type="button"
            className={
              'morebtn' +
              (moreOpen ? ' morebtn--open' : '') +
              (moreActive ? ' morebtn--active' : '')
            }
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-label={moreOpen ? 'Close menu' : 'More — safe list, ask, report'}
          >
            {moreOpen ? <CloseIcon /> : <MenuIcon />}
            {hiddenBadge && !moreOpen ? (
              <span className="morebtn-dot" aria-hidden="true" />
            ) : null}
          </button>
          <span className="tabbar-more-label">More</span>
        </div>
      </nav>
    </div>
  )
}

/* Icons — 24px grid, 1.7 stroke, to sit with the Gemini set. */

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M5 8h14M5 12h14M5 16h14" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  )
}

/* Two panels, one flipped — the front and the back of the same pack. */
function ClaimIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="7.5" height="14" rx="1.5" />
      <rect x="13.5" y="5" width="7.5" height="14" rx="1.5" />
      <path d="M6 9.5h1.5M6 12h2.5" />
      <path d="M16.5 9.5h2M16.5 12h2M16.5 14.5h1.5" />
    </svg>
  )
}

function FamilyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 14.8c2 .7 3.2 2.4 3.2 4.7" />
    </svg>
  )
}

function AskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z" />
      <path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.5.2-.8.6-.8 1.1v.3" />
      <path d="M11.8 14.6v.3" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M5 20V11M12 20V5M19 20v-6" />
      <path d="M3 20h18" />
    </svg>
  )
}

function SafeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M14 4v5h5" />
      <path d="M9 14.2l2 2 4-4.4" />
    </svg>
  )
}
