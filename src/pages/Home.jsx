import { Link, useNavigate } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import { summarise } from '../data/profiles.js'
import Avatar from '../components/Avatar.jsx'
import Sparkle from '../components/Sparkle.jsx'

export default function Home() {
  const { family, cart, activeId, setActiveId, lastScan, activePerson } = usePalat()
  const navigate = useNavigate()

  return (
    <div className="page page--home">
      <header className="hero">
        <div className="hero-mark">
          <Sparkle size={30} />
          <h1>Palat</h1>
        </div>
        <p className="hero-line">Flip the packet. Then decide.</p>
        <p className="hero-sub">
          The front of a packet is written for marketing. The back is written for
          lawyers. Palat reads the back for the person who is actually eating it.
        </p>
      </header>

      <section className="block">
        <div className="block-head">
          <h2>Who's eating?</h2>
          <Link to="/family" className="block-action">
            {family.length ? 'Edit family' : 'Add someone'}
          </Link>
        </div>
        <p className="block-sub">Same packet, a different answer for each person.</p>

        {family.length ? (
          <div className="people">
            {family.map((person) => (
              <button
                key={person.id}
                type="button"
                className={'person' + (person.id === activeId ? ' person--on' : '')}
                onClick={() => setActiveId(person.id)}
                aria-pressed={person.id === activeId}
              >
                <Avatar person={person} size={42} />
                <span className="person-name">{person.name}</span>
                <span className="person-meta">{summarise(person)}</span>
              </button>
            ))}
          </div>
        ) : (
          <Link to="/family" className="empty empty--link">
            <strong>Nobody is set up yet.</strong>
            <span>Tell Palat who eats at home — once, and never again.</span>
          </Link>
        )}
      </section>

      <section className="block">
        <button type="button" className="cta" onClick={() => navigate('/scan')}>
          <span className="cta-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          </span>
          <span className="cta-text">
            <strong>Scan the back of a packet</strong>
            <span>Ingredients and nutrition table</span>
          </span>
        </button>

        <button
          type="button"
          className="cta cta--quiet"
          onClick={() => navigate('/scan?mode=plate')}
        >
          <span className="cta-icon cta-icon--quiet">
            <svg viewBox="0 0 24 24" fill="none" stroke="#c7cbd0" strokeWidth="1.7">
              <circle cx="12" cy="12" r="8.5" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          </span>
          <span className="cta-text">
            <strong>No label? Point at the plate</strong>
            <span>Mithai shop, wedding buffet, tiffin</span>
          </span>
        </button>
      </section>

      {lastScan ? (
        <section className="block">
          <div className="block-head">
            <h2>Last scan</h2>
            <Link to="/scan" className="block-action">Open</Link>
          </div>
          <Link to="/scan" className="recall">
            <span className="recall-name">{lastScan.label.productName || 'A packet'}</span>
            <span className="recall-verdicts">
              {lastScan.verdicts.map((v) => {
                const p = family.find((f) => f.id === v.personId)
                if (!p) return null
                return (
                  <span key={v.personId} className={'recall-chip recall-chip--' + tone(v.verdict)}>
                    {p.name}
                  </span>
                )
              })}
            </span>
          </Link>
        </section>
      ) : null}

      <section className="block">
        <div className="block-head">
          <h2>{activePerson ? activePerson.name + "'s cart" : 'Cart'}</h2>
          <Link to="/cart" className="block-action">
            {cart.length ? 'Open cart' : 'Empty'}
          </Link>
        </div>
        {cart.length ? (
          <div className="pills">
            {cart.slice(0, 6).map((item) => (
              <span key={item.id} className="pill">{item.name}</span>
            ))}
            {cart.length > 6 ? <span className="pill pill--more">+{cart.length - 6}</span> : null}
          </div>
        ) : (
          <p className="block-sub">
            Nothing in the cart yet. Whatever Palat suggests instead of a packet
            lands here, so the shopping list builds itself as you walk the aisle.
          </p>
        )}
      </section>

      <p className="disclaimer">
        Palat reads labels. It does not diagnose. For medicines and dosage, check
        with your doctor.
      </p>
    </div>
  )
}

const tone = (v) => ({ NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }[v] || 'maybe')
