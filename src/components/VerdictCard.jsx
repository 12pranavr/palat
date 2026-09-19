import { usePalat } from '../store/store.jsx'

const TONE = {
  NO: { key: 'no', glyph: '✕' },
  SOMETIMES: { key: 'maybe', glyph: '~' },
  YES: { key: 'yes', glyph: '✓' },
}

export default function VerdictCard({ person, verdict, productName }) {
  const { addToCart, inCart } = usePalat()
  if (!verdict || !person) return null

  const tone = TONE[verdict.verdict] || TONE.SOMETIMES
  const hasSwap = verdict.better && verdict.better !== '—'
  const swapAdded = hasSwap && inCart(verdict.better, 'swap')

  return (
    <section className={'verdict verdict--' + tone.key} key={person.id + verdict.verdict}>
      <header className="verdict-head">
        <span className="verdict-glyph">{tone.glyph}</span>
        <h2 className="verdict-headline">{verdict.headline}</h2>
      </header>

      <p className="verdict-line">{verdict.reason}</p>

      {verdict.hindi ? (
        <p className="verdict-hindi" lang="hi">
          {verdict.hindi}
        </p>
      ) : null}

      {verdict.keyNumbers?.length ? (
        <ul className="flags">
          {verdict.keyNumbers.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      ) : null}

      {verdict.portion && verdict.portion !== '—' ? (
        <p className="verdict-portion">
          <span>How much</span>
          <strong>{verdict.portion}</strong>
        </p>
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
              addToCart({
                name: verdict.better,
                kind: 'swap',
                note: 'Instead of ' + (productName || 'the packet you scanned'),
                forPerson: person.name,
              })
            }
          >
            {swapAdded ? 'In cart ✓' : 'Add to cart'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
