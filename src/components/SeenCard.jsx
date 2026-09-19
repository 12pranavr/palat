/**
 * What is visible in the photograph — kept deliberately apart from the nutrition
 * verdict, because they answer different questions and must never be mistaken
 * for each other. Nutrition says whether this food suits this person. This says
 * what you can see from where you are standing, right now.
 *
 * It is not a rating of whoever cooked it. One photograph is one moment, and the
 * raids that prompted this feature found expired stock in five-star kitchens —
 * so the setting is not the signal. The plate is.
 */
export default function SeenCard({ seen }) {
  if (!seen) return null

  const concerns = seen.concerns || []
  const good = seen.good || []
  if (!concerns.length && !good.length && !seen.note) return null

  const high = concerns.filter((c) => c.severity === 'high')

  return (
    <section className={'seen' + (high.length ? ' seen--high' : '')}>
      <div className="seen-head">
        <EyeIcon />
        <h3>What you can see</h3>
      </div>

      {seen.note ? <p className="seen-note">{seen.note}</p> : null}

      {concerns.length ? (
        <ul className="seen-list">
          {concerns.map((c, i) => (
            <li key={i} className={'seen-item seen-item--' + c.severity}>
              <span className="seen-dot" />
              <span className="seen-text">
                <strong>{c.what}</strong>
                <span>{c.why}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {good.length ? (
        <ul className="seen-good">
          {good.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      ) : null}

      <p className="seen-limit">
        Only what the photo shows. Palat cannot tell whether anything here is
        fresh or expired, whether the oil has been used before, or how the kitchen
        behind is run — none of that is visible in a picture.
      </p>
    </section>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
