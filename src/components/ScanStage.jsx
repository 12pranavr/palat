/**
 * The camera view: corner brackets, and a sweep that only runs while something
 * is genuinely in flight. The status lines below it are driven by real phases,
 * not a timer — if Gemini is slow, the line sits there and waits.
 */
export default function ScanStage({ photo, scanning, status = [], mode }) {
  return (
    <div className="stage-wrap">
      <div className={'stage' + (photo ? ' stage--has-photo' : '')}>
        {photo ? (
          <img className="stage-photo" src={photo} alt="What you photographed" />
        ) : (
          <div className="stage-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <p>
              {mode === 'plate'
                ? 'Point the phone at the plate'
                : 'The back of the packet, not the front'}
            </p>
            <span>
              {mode === 'plate'
                ? 'Thali, mithai counter, wedding buffet'
                : 'Ingredient list and nutrition table in frame'}
            </span>
          </div>
        )}

        <div className="brackets" aria-hidden="true">
          <span /><span /><span /><span />
        </div>

        {scanning ? <div className="sweep" aria-hidden="true" /> : null}
      </div>

      {status.length ? (
        <ul className="status" aria-live="polite">
          {status.map((s, i) => (
            <li key={s.text} className={s.done ? 'is-done' : 'is-live'}>
              <span className="status-dot">{s.done ? '✓' : ''}</span>
              {s.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
