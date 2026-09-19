import ListenButton from './ListenButton.jsx'

/**
 * The wall of claims on the front, each one answered.
 *
 * A pack does not make one claim. Sunfeast Farmlite Sugar Free Hazelnut & Oat
 * carries five at once — sugar free, hazelnut, oat, source of protein, no trans
 * fat, lactose free — and answering only on sugar leaves a family assuming the
 * other four were checked and passed.
 *
 * The ones that hold up stay on the list rather than being filtered out. A read
 * that only ever finds fault is a prejudice, and a family that notices will stop
 * believing the findings that matter.
 */
const TONE = {
  misleading: { key: 'no', glyph: '✕', word: 'Misleading' },
  technically: { key: 'maybe', glyph: '~', word: 'Technically true' },
  holds: { key: 'yes', glyph: '✓', word: 'Holds up' },
}

export default function ClaimList({ checks = [], compact = false }) {
  if (!checks.length) return null

  const bad = checks.filter((c) => c.verdict !== 'holds')
  const rows = compact ? bad : checks
  if (!rows.length) return null

  const spoken = rows
    .map((c) => `${c.claim}. ${TONE[c.verdict]?.word || ''}. ${c.reality}`)
    .join(' ')

  return (
    <section className={'claims' + (compact ? ' claims--compact' : '')}>
      <header className="claims-head">
        <div>
          <p className="claims-title">
            {bad.length
              ? `${bad.length} of ${checks.length} claim${checks.length === 1 ? '' : 's'} ${
                  bad.length === 1 ? 'does not' : 'do not'
                } hold up`
              : 'Every claim on this pack holds up'}
          </p>
          {!compact ? (
            <p className="claims-sub">
              Checked against the ingredient list, one by one.
            </p>
          ) : null}
        </div>
        <ListenButton text={spoken} label="Listen to the claim check" />
      </header>

      <ul className="claims-list">
        {rows.map((c, i) => {
          const tone = TONE[c.verdict] || TONE.technically
          return (
            <li key={c.claim + i} className={'claimrow claimrow--' + tone.key}>
              <span className="claimrow-glyph" aria-hidden="true">
                {tone.glyph}
              </span>
              <div className="claimrow-body">
                <p className="claimrow-claim">
                  <span className="claimrow-quote">&ldquo;{c.claim}&rdquo;</span>
                  <span className="claimrow-word">{tone.word}</span>
                </p>
                <p className="claimrow-reality">{c.reality}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {compact && checks.length > bad.length ? (
        <p className="claims-foot">
          {checks.length - bad.length} other claim
          {checks.length - bad.length === 1 ? '' : 's'} on this pack checked out.
        </p>
      ) : null}
    </section>
  )
}
