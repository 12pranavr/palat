import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import Avatar from '../components/Avatar.jsx'

const WEEK = 7 * 24 * 60 * 60 * 1000
const RANGES = [
  { key: 'week', label: 'This week', ms: WEEK },
  { key: 'month', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'Everything', ms: Infinity },
]

/**
 * The report counts what a person did NOT eat. Every other food app counts what
 * you ate and makes you feel behind; this one shows the packets that went back
 * on the shelf, which is the thing Palat actually changed.
 */
export default function Report() {
  const { family, history, activeId, setActiveId, clearHistory } = usePalat()
  const [range, setRange] = useState('week')

  const span = RANGES.find((r) => r.key === range)
  const since = span.ms === Infinity ? 0 : Date.now() - span.ms
  const person = family.find((p) => p.id === activeId) || family[0]

  const stats = useMemo(() => {
    if (!person) return null
    const scans = history.filter((h) => h.at >= since && h.verdicts[person.id])

    const avoided = scans.filter((h) => h.verdicts[person.id] === 'NO')
    const careful = scans.filter((h) => h.verdicts[person.id] === 'SOMETIMES')
    const fine = scans.filter((h) => h.verdicts[person.id] === 'YES')

    // What kept showing up in the things they put back.
    const counts = new Map()
    for (const h of avoided) {
      for (const flag of h.flags || []) {
        counts.set(flag, (counts.get(flag) || 0) + 1)
      }
    }
    const worst = [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5)

    const swaps = [
      ...new Set(avoided.map((h) => h.better?.[person.id]).filter(Boolean)),
    ].slice(0, 5)

    return { scans, avoided, careful, fine, worst, swaps }
  }, [history, person, since])

  if (!family.length) {
    return (
      <div className="page">
        <h1 className="page-title">Report</h1>
        <Link to="/family" className="empty empty--link">
          <strong>Set up the family first.</strong>
          <span>There is nothing to report on until Palat knows who is eating.</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="page page--report">
      <header className="page-head">
        <h1 className="page-title">Report</h1>
        {history.length ? (
          <button
            type="button"
            className="ghost ghost--danger"
            onClick={() => {
              if (confirm('Delete every scan Palat has remembered?')) clearHistory()
            }}
          >
            Clear history
          </button>
        ) : null}
      </header>
      <p className="page-sub">
        What each person did not eat. Not a diary of everything they did.
      </p>

      <div className="ptabs">
        {family.map((p) => (
          <button
            key={p.id}
            className={'ptab' + (p.id === person.id ? ' ptab--on' : '')}
            onClick={() => setActiveId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="modes" role="tablist" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={range === r.key}
            className={'mode' + (range === r.key ? ' mode--on' : '')}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!stats.scans.length ? (
        <Link to="/scan" className="empty empty--link">
          <strong>Nothing scanned in this stretch.</strong>
          <span>Scan a few packets and the report fills itself in.</span>
        </Link>
      ) : (
        <>
          <section className="tally">
            <div className="tally-hero">
              <Avatar person={person} size={44} />
              <div>
                <strong>
                  {stats.avoided.length === 0
                    ? 'Nothing was turned away'
                    : stats.avoided.length === 1
                      ? '1 packet went back on the shelf'
                      : `${stats.avoided.length} packets went back on the shelf`}
                </strong>
                <span>
                  out of {stats.scans.length} {stats.scans.length === 1 ? 'scan' : 'scans'} for{' '}
                  {person.name}
                </span>
              </div>
            </div>

            <div className="tally-row">
              <Stat n={stats.avoided.length} label="Not for them" tone="no" />
              <Stat n={stats.careful.length} label="Careful" tone="maybe" />
              <Stat n={stats.fine.length} label="Fine" tone="yes" />
            </div>
          </section>

          {stats.worst.length ? (
            <section className="block">
              <div className="block-head">
                <h2>What kept turning up</h2>
              </div>
              <p className="block-sub">
                In the packets {person.name} put back, these came up most often.
              </p>
              <ul className="worst">
                {stats.worst.map(([term, n]) => (
                  <li key={term}>
                    <span className="worst-term">{term}</span>
                    <span className="worst-bar">
                      <span
                        style={{
                          width:
                            Math.round((n / stats.worst[0][1]) * 100) + '%',
                        }}
                      />
                    </span>
                    <span className="worst-n">
                      {n}×
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {stats.swaps.length ? (
            <section className="block">
              <div className="block-head">
                <h2>Suggested instead</h2>
              </div>
              <div className="pills">
                {stats.swaps.map((s) => (
                  <span key={s} className="pill">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="block">
            <div className="block-head">
              <h2>Everything scanned</h2>
              <span className="block-count">{stats.scans.length}</span>
            </div>
            <ul className="hist">
              {stats.scans.slice(0, 20).map((h) => (
                <li key={h.id} className={'hist-row hist-row--' + tone(h.verdicts[person.id])}>
                  <span className="hist-dot" />
                  <div className="hist-text">
                    <strong>{h.productName}</strong>
                    <span>
                      {when(h.at)}
                      {h.isEstimate ? ' · estimate' : ''}
                    </span>
                  </div>
                  <span className="hist-verdict">{WORD[h.verdicts[person.id]]}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="disclaimer">
        Counted from what Palat told you at the time, not from what anyone actually
        ate. It is a record of decisions, not a food diary.
      </p>
    </div>
  )
}

const WORD = { NO: 'No', SOMETIMES: 'Careful', YES: 'Fine' }
const tone = (v) => ({ NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }[v] || 'maybe')

function Stat({ n, label, tone }) {
  return (
    <div className={'stat stat--' + tone}>
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  )
}

function when(ts) {
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return days + ' days ago'
  return new Date(ts).toLocaleDateString()
}
