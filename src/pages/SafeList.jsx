import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import Avatar from '../components/Avatar.jsx'

const TONE = { NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }

/**
 * One list per person, which is what the idea was always about: the answer to
 * "what can Dadaji have?" is not the same as the answer for Chotu, so they
 * cannot share a list.
 */
export default function SafeList() {
  const { family, listFor, activeId, setActiveId, removeFromSafeList, clearSafeList } =
    usePalat()
  const [copied, setCopied] = useState(false)

  const person = family.find((p) => p.id === activeId) || family[0]
  const items = useMemo(() => (person ? listFor(person.id) : []), [person, listFor])

  const { fine, flagged } = useMemo(() => {
    const fine = []
    const flagged = []
    for (const item of items) {
      // A packet added anyway, that this person was told no to.
      if (item.verdicts?.[person.id] === 'NO') flagged.push(item)
      else fine.push(item)
    }
    return { fine, flagged }
  }, [items, person])

  async function copyList() {
    const text = items.map((i) => '- ' + i.name).join('\n')
    try {
      await navigator.clipboard.writeText(`${person.name}'s list\n${text}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (!family.length) {
    return (
      <div className="page">
        <h1 className="page-title">Safe list</h1>
        <Link to="/family" className="empty empty--link">
          <strong>Set up the family first.</strong>
          <span>A safe list belongs to a person, so Palat needs to know one.</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="page page--safe">
      <header className="page-head">
        <h1 className="page-title">Safe list</h1>
        {items.length ? <span className="block-count">{items.length}</span> : null}
      </header>
      <p className="page-sub">
        What Palat has cleared for each person, built as you scan.
      </p>

      <div className="ptabs">
        {family.map((p) => {
          const n = listFor(p.id).length
          return (
            <button
              key={p.id}
              className={'ptab' + (p.id === person.id ? ' ptab--on' : '')}
              onClick={() => setActiveId(p.id)}
            >
              {p.name}
              {n ? <span className="ptab-count">{n}</span> : null}
            </button>
          )
        })}
      </div>

      {!items.length ? (
        <Link to="/scan" className="empty empty--link">
          <strong>Nothing on {person.name}'s list yet.</strong>
          <span>
            Scan a packet, and whatever Palat suggests instead for {person.name} lands
            here.
          </span>
        </Link>
      ) : (
        <>
          <div className="cart-tools">
            <button type="button" className="ghost" onClick={copyList}>
              {copied ? 'Copied ✓' : 'Copy list'}
            </button>
            <button
              type="button"
              className="ghost ghost--danger"
              onClick={() => {
                if (confirm(`Empty ${person.name}'s safe list?`)) clearSafeList(person.id)
              }}
            >
              Empty {person.name}'s list
            </button>
          </div>

          {fine.length ? (
            <section className="block">
              <div className="block-head">
                <h2>Cleared for {person.name}</h2>
              </div>
              <ul className="cart-list">
                {fine.map((item) => (
                  <Row key={item.id} item={item} person={person} onRemove={removeFromSafeList} />
                ))}
              </ul>
            </section>
          ) : null}

          {flagged.length ? (
            <section className="block">
              <div className="block-head">
                <h2>Added anyway</h2>
              </div>
              <p className="block-sub">
                {person.name} was told no to {flagged.length === 1 ? 'this' : 'these'}, and
                {flagged.length === 1 ? ' it is' : ' they are'} on the list regardless.
              </p>
              <ul className="cart-list">
                {flagged.map((item) => (
                  <Row key={item.id} item={item} person={person} onRemove={removeFromSafeList} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <p className="disclaimer">
        "Safe" here means Palat read the label and it suits {person.name}'s conditions
        — nothing more. It says nothing about whether the food was stored, cooked or
        handled cleanly; that is what the plate scan looks at. Verdicts were worked
        out when each item was added, so if the family changes, scan again.
      </p>
    </div>
  )
}

function Row({ item, person, onRemove }) {
  const verdict = item.verdicts?.[person.id]

  return (
    <li className="cart-row">
      <span className={'cart-kind cart-kind--' + item.kind} aria-hidden="true">
        {item.kind === 'swap' ? '↑' : '□'}
      </span>

      <div className="cart-text">
        <strong>{item.name}</strong>
        {item.note ? <span>{item.note}</span> : null}
        {verdict ? (
          <span className="cart-verdicts">
            <span className={'cart-chip cart-chip--' + TONE[verdict]}>
              {verdict === 'NO' ? 'Not for ' + person.name : 'Fine for ' + person.name}
            </span>
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="cart-remove"
        onClick={() => onRemove(item.id)}
        aria-label={'Remove ' + item.name}
      >
        ✕
      </button>
    </li>
  )
}
