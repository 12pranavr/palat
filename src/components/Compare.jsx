import { compareFor } from '../lib/compare.js'

const TONE = { NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }
const WORD = { NO: 'No', SOMETIMES: 'Sometimes', YES: 'Yes' }

/**
 * Two packets, one person, one answer. The winner is worked out from the two
 * readings already in hand — no second trip to Gemini, and the reason is always
 * a fact off one of the labels.
 */
export default function Compare({ person, a, b, onStart, onClear, comparing }) {
  if (!b) {
    return (
      <button type="button" className="wide-add" disabled={comparing} onClick={onStart}>
        Compare with another packet
      </button>
    )
  }

  const result = compareFor(person, a, b)
  if (!result) return null

  const cards = [
    { key: 'a', scan: a, verdict: result.verdictA },
    { key: 'b', scan: b, verdict: result.verdictB },
  ]

  return (
    <section className="compare">
      <div className="compare-head">
        <h3>Which one for {person.name}?</h3>
        <button type="button" className="ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="compare-grid">
        {cards.map(({ key, scan, verdict }) => {
          const won = result.winner === key
          return (
            <div
              key={key}
              className={
                'compare-card' +
                (won ? ' compare-card--win' : '') +
                (result.winner !== 'tie' && !won ? ' compare-card--lose' : '')
              }
            >
              {scan.photo ? <img src={scan.photo} alt="" /> : null}
              <strong>{scan.label?.productName || 'Packet'}</strong>
              <span className={'compare-verdict compare-verdict--' + TONE[verdict]}>
                {WORD[verdict]}
              </span>
              {won ? <span className="compare-badge">Pick this</span> : null}
            </div>
          )
        })}
      </div>

      <p className="compare-why">{result.reason}</p>
    </section>
  )
}
