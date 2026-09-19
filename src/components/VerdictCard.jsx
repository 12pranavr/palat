import { usePalat } from '../store/store.jsx'
import ListenButton from './ListenButton.jsx'

const TONE = {
  NO: { key: 'no', glyph: '✕' },
  SOMETIMES: { key: 'maybe', glyph: '~' },
  YES: { key: 'yes', glyph: '✓' },
}

const said = (v) => v && v !== '—' && String(v).trim()

/**
 * The number comes first.
 *
 * Everything else on this card is explanation; the only thing a person standing
 * in a shop actually needs is how many they can have. Putting the count above the
 * reasoning is what turns a verdict into an instruction — and quoting the pack's
 * own serving line underneath it means the strictest number on screen is the
 * manufacturer's, not Palat's.
 */
export default function VerdictCard({ person, verdict, productName }) {
  const { addToSafeList, onSafeList } = usePalat()
  if (!verdict || !person) return null

  const tone = TONE[verdict.verdict] || TONE.SOMETIMES
  const hasSwap = said(verdict.better)
  const swapAdded = hasSwap && onSafeList(verdict.better, 'swap', person.id)

  // Older scans stored before the portion split still render sensibly.
  const amount = said(verdict.portion) || (verdict.verdict === 'NO' ? '0' : '—')
  const unit = said(verdict.portionUnit) || 'to have'
  const packSays = said(verdict.packSays)

  // Spoken aloud, so each part needs to land as its own sentence — without the
  // full stop the headline runs straight into the number ("Fine for Chotu 1
  // piece after food").
  const sentence = (t) => (t && /[.!?]$/.test(t.trim()) ? t.trim() : `${(t || '').trim()}.`)

  const spoken = [
    sentence(verdict.headline),
    `${amount} ${unit}.`,
    packSays ? sentence(packSays) : '',
    verdict.reason,
    hasSwap ? `Better: ${verdict.better}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={'verdict verdict--' + tone.key} key={person.id + verdict.verdict}>
      <header className="verdict-head">
        <span className="verdict-glyph">{tone.glyph}</span>
        <h2 className="verdict-headline">{verdict.headline}</h2>
        <ListenButton text={spoken} label={`Listen to the verdict for ${person.name}`} />
      </header>

      <div className="howmuch">
        <p className="howmuch-figure">
          <strong className="howmuch-amount">{amount}</strong>
          <span className="howmuch-unit">{unit}</span>
        </p>
        {packSays ? <p className="howmuch-pack">{packSays}</p> : null}
      </div>

      <p className="verdict-line">{verdict.reason}</p>

      {verdict.keyNumbers?.length ? (
        <ul className="flags">
          {verdict.keyNumbers.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      ) : null}

      {verdict.guarded ? (
        <p className="guarded">
          Palat tightened this from {verdict.originalVerdict.toLowerCase()} —{' '}
          {verdict.guardReason}.
        </p>
      ) : null}

      {hasSwap ? (
        <div className="swap">
          <div className="swap-text">
            <span className="swap-label">Better on the same shelf</span>
            <strong className="swap-name">{verdict.better}</strong>
          </div>
          <button
            type="button"
            className={'swap-add' + (swapAdded ? ' swap-add--done' : '')}
            disabled={swapAdded}
            onClick={() =>
              addToSafeList({
                name: verdict.better,
                kind: 'swap',
                note: 'Instead of ' + (productName || 'the packet you scanned'),
                forPerson: person.name,
                forPersonId: person.id,
              })
            }
          >
            {swapAdded ? 'On the list ✓' : `Add to ${person.name}'s list`}
          </button>
        </div>
      ) : null}
    </section>
  )
}
