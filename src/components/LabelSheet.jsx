const ROWS = [
  ['energyKcal', 'Energy', 'kcal'],
  ['totalSugarG', 'Total sugar', 'g'],
  ['addedSugarG', 'Added sugar', 'g'],
  ['carbsG', 'Carbohydrate', 'g'],
  ['proteinG', 'Protein', 'g'],
  ['fibreG', 'Fibre', 'g'],
  ['totalFatG', 'Total fat', 'g'],
  ['satFatG', 'Saturated fat', 'g'],
  ['transFatG', 'Trans fat', 'g'],
  ['sodiumMg', 'Sodium', 'mg'],
]

const blank = (v) => !v || v === '—' || /^(n\/?a|none|nil|unknown)$/i.test(String(v).trim())

export default function LabelSheet({ label, findings = [] }) {
  const nutrition = label.nutritionPer100g || {}
  const rows = ROWS.filter(([key]) => !blank(nutrition[key]))
  const findingFor = (ingredient) => findings.find((f) => f.ingredient === ingredient)

  return (
    <details className="sheet">
      <summary>
        <span>What Palat read off the back</span>
        <span className="sheet-mark" aria-hidden="true" />
      </summary>

      {label.ingredients?.length ? (
        <>
          <h3 className="sheet-h">Ingredients, in the order printed</h3>
          <ol className="ingredients">
            {label.ingredients.map((item, i) => {
              const flag = findingFor(item)
              return (
                <li key={i} className={flag ? 'flagged flagged--' + flag.category : ''}>
                  <span className="ing-name">{item}</span>
                  {flag ? (
                    <span className="ing-flag">
                      <strong>{flag.categoryLabel}</strong> {flag.note}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </>
      ) : null}

      {rows.length ? (
        <>
          <h3 className="sheet-h">
            Per 100 g
            {!blank(label.servingSize) ? ' · serving ' + label.servingSize : ''}
          </h3>
          <table className="nutrition">
            <tbody>
              {rows.map(([key, name, unit]) => (
                <tr key={key}>
                  <th scope="row">{name}</th>
                  <td>
                    {nutrition[key]}
                    {/[a-z]/i.test(String(nutrition[key])) ? '' : ' ' + unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {!blank(label.unreadableNote) ? (
        <p className="sheet-note">{label.unreadableNote}</p>
      ) : null}
    </details>
  )
}
