import { usePalat } from '../store/store.jsx'

const TONE = { NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }
const WORD = { NO: 'No', SOMETIMES: 'Sometimes', YES: 'Yes' }

/**
 * Five packets, one person at a time. The question in an aisle is never "tell me
 * about these five" — it is "which of these can Dadaji have", so the list is
 * sorted best-first for whoever is selected.
 */
export default function BatchResults({ products, person, onOpen }) {
  const { addToSafeList, onSafeList } = usePalat()

  const rows = products
    .map((p) => {
      if (p.failed) return { ...p, verdict: null }
      return { ...p, verdict: p.verdicts.find((v) => v.personId === person.id) }
    })
    .sort((a, b) => {
      const rank = { YES: 0, SOMETIMES: 1, NO: 2 }
      return (rank[a.verdict?.verdict] ?? 3) - (rank[b.verdict?.verdict] ?? 3)
    })

  const ok = rows.filter((r) => r.verdict?.verdict === 'YES').length

  return (
    <section className="batch">
      <p className="batch-lead">
        {ok === 0
          ? `Nothing here is a plain yes for ${person.name}.`
          : ok === rows.length
            ? `All ${rows.length} are fine for ${person.name}.`
            : `${ok} of ${rows.length} fine for ${person.name}.`}
      </p>

      <ul className="batch-list">
        {rows.map((row) => {
          if (row.failed) {
            return (
              <li key={row.index} className="batch-row batch-row--failed">
                {row.photo ? <img src={row.photo} alt="" /> : null}
                <div className="batch-text">
                  <strong>Could not read this photo</strong>
                  <span>Try it again on its own, closer in.</span>
                </div>
              </li>
            )
          }

          const v = row.verdict
          const name = row.label.productName || 'Packet'
          const swap = v.better && v.better !== '—'
          const added = swap && onSafeList(v.better, 'swap', person.id)

          return (
            <li key={row.index} className={'batch-row batch-row--' + TONE[v.verdict]}>
              <button type="button" className="batch-main" onClick={() => onOpen(row)}>
                {row.photo ? <img src={row.photo} alt="" /> : null}
                <div className="batch-text">
                  <strong>{name}</strong>
                  <span>{v.reason}</span>
                </div>
                <span className="batch-verdict">{WORD[v.verdict]}</span>
              </button>

              {swap ? (
                <div className="batch-swap">
                  <span>
                    Instead: <strong>{v.better}</strong>
                  </span>
                  <button
                    type="button"
                    className={'swap-add' + (added ? ' swap-add--done' : '')}
                    disabled={added}
                    onClick={() =>
                      addToSafeList({
                        name: v.better,
                        kind: 'swap',
                        note: 'Instead of ' + name,
                        forPerson: person.name,
                        forPersonId: person.id,
                      })
                    }
                  >
                    {added ? 'On the list ✓' : 'Add'}
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
