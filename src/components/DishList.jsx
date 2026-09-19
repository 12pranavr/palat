import { usePalat } from '../store/store.jsx'

const TONE = { NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }
const WORD = { NO: 'SKIP', SOMETIMES: 'SOME', YES: 'YES' }

/** Plate mode: one row per dish, called for whoever is selected. */
export default function DishList({ dishes, personId }) {
  const { family } = usePalat()
  const person = family.find((p) => p.id === personId)
  if (!dishes?.length) return null

  return (
    <ul className="dishes">
      {dishes.map((dish) => {
        const call = dish.calls?.find((c) => c.personId === personId)
        const tone = TONE[call?.verdict] || 'maybe'
        return (
          <li key={dish.name} className={'dish dish--' + tone}>
            <span className="dish-dot" />
            <div className="dish-text">
              <strong>{dish.name}</strong>
              <span>{call?.portion && call.portion !== '—' ? call.portion : dish.note}</span>
            </div>
            <span className="dish-call">{WORD[call?.verdict] || '—'}</span>
          </li>
        )
      })}
      <li className="dishes-note">
        No label here, so these are estimates from what is on the plate — portion,
        not chemistry. Shown for {person?.name || 'this person'}.
      </li>
    </ul>
  )
}
