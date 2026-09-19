import { NavLink, Outlet } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import { isDemoMode } from '../lib/api.js'
import Sparkle from './Sparkle.jsx'
import PoweredBy from './PoweredBy.jsx'

const NAV = [
  { to: '/', label: 'Home', end: true, icon: HomeIcon },
  { to: '/scan', label: 'Scan', icon: ScanIcon },
  { to: '/family', label: 'Family', icon: FamilyIcon },
  { to: '/cart', label: 'Cart', icon: CartIcon },
  { to: '/ask', label: 'Ask', icon: AskIcon },
  { to: '/report', label: 'Report', icon: ReportIcon },
]

export default function Layout() {
  const { cart, family } = usePalat()

  const badgeFor = (to) => {
    if (to === '/cart' && cart.length) return cart.length
    if (to === '/family' && family.length) return family.length
    return null
  }

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

      <nav className="tabbar">
        {NAV.map(({ to, label, end, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className="tabbar-link">
            <span className="tabbar-icon">
              <Icon />
              {badgeFor(to) && to === '/cart' ? (
                <span className="tabbar-badge">{badgeFor(to)}</span>
              ) : null}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/* Icons — 24px grid, 1.7 stroke, to sit with the Gemini set. */

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

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2.2l2.2 10.4a1.5 1.5 0 0 0 1.5 1.2h7.8a1.5 1.5 0 0 0 1.5-1.2L20 7.5H6" />
      <circle cx="9.5" cy="19.5" r="1.3" />
      <circle cx="16.5" cy="19.5" r="1.3" />
    </svg>
  )
}
