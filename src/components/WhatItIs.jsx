import ListenButton from './ListenButton.jsx'

/**
 * The biryani test, on screen.
 *
 * Chicken biryani should be mostly chicken. If there is more potato than
 * chicken, it is potato biryani — everyone gets that instantly, and nobody needs
 * a nutrition table to be talked into it. Packaged food runs the same trick with
 * a straight face, and "hazelnut 4%, refined wheat flour 37.1%" is the right
 * fact delivered the wrong way: it leaves the arithmetic to someone standing in
 * a shop holding a packet.
 *
 * So this card leads with the sentence, not the numbers. The honest name is the
 * headline, the ratio is the proof underneath it, and the percentages are the
 * receipts at the bottom for anyone who wants to check.
 */
export default function WhatItIs({ check }) {
  if (!check || (!check.honestName && !check.plainly)) return null

  const spoken = [check.honestName, check.plainly].filter(Boolean).join('. ')

  return (
    <section className="whatitis">
      <header className="whatitis-head">
        <span className="whatitis-label">What this actually is</span>
        <ListenButton text={spoken} label="Listen to what this actually is" />
      </header>

      {check.honestName ? (
        <p className="whatitis-name">{check.honestName}</p>
      ) : null}

      {check.times ? (
        <p className="whatitis-ratio">
          <strong>{check.times}×</strong>
          <span>
            more {shortName(check.dominantTerm || check.actuallyMostly)} than{' '}
            {shortName(check.heroTerm || check.namedAfter)}
          </span>
        </p>
      ) : null}

      {check.plainly ? <p className="whatitis-plainly">{check.plainly}</p> : null}

      {check.namedAfter || check.actuallyMostly ? (
        <dl className="whatitis-rows">
          {check.namedAfter ? (
            <div className="whatitis-row">
              <dt>Named after</dt>
              <dd>{check.namedAfter}</dd>
            </div>
          ) : null}
          {check.actuallyMostly ? (
            <div className="whatitis-row">
              <dt>Actually mostly</dt>
              <dd>{check.actuallyMostly}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  )
}

/**
 * "Refined Wheat Flour (Maida) (37.1%)" reads badly mid-sentence, and so does a
 * field that lists two ingredients when the ratio only compares one. Strip the
 * percentages and the parenthetical alias, then keep the first clause.
 */
function shortName(value) {
  if (!value) return 'it'
  return String(value)
    .replace(/\s*\(\s*[\d.]+\s*%\s*\)/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .split(/\s*,\s*| and /)[0]
    .trim()
    .toLowerCase()
}
