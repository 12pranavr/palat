import ListenButton from './ListenButton.jsx'

/**
 * Once you open it.
 *
 * The best-before date on a pack describes a pack nobody has opened. Every
 * family reads it as the answer for the half-eaten packet in the kitchen, and it
 * answers a different question entirely — the sealed one, under stated storage
 * conditions. In India a post-opening instruction is only required where health
 * and safety demand one, which is why ketchup and juice carry it and a biscuit
 * packet usually does not.
 *
 * So there are exactly two things worth showing, and the second is not a
 * failure to find the first:
 *
 *   The pack says so     quote it, and say plainly that best before no longer
 *                        governs once the seal is broken.
 *   The pack is silent   say that. It is a real finding, not an empty state.
 *
 * What is never shown is a number Palat made up. Palat photographed a label, not
 * a kitchen — it does not know when this packet was opened and is not tracking
 * it. Qualitative advice tied to an ingredient it genuinely read is honest; a
 * period it invented would poison every other finding on the screen.
 */
export default function OnceOpened({ check }) {
  if (!check) return null

  const { printed, afterOpening, bestBefore, whyItChanges, keepIn } = check
  if (!printed && !bestBefore && !whyItChanges) return null

  const spoken = [
    'Once you open it.',
    printed ? `${afterOpening}. The pack says so.` : 'This pack does not say.',
    bestBefore ? `${bestBefore} — that is for the sealed pack.` : '',
    whyItChanges,
    keepIn,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={'opened' + (printed ? ' opened--printed' : ' opened--silent')}>
      <header className="opened-head">
        <span className="opened-label">Once you open it</span>
        <ListenButton text={spoken} label="Listen to what happens once it is opened" />
      </header>

      <p className="opened-answer">
        {printed ? afterOpening : 'This pack doesn’t say.'}
      </p>

      {printed ? (
        <p className="opened-source">The pack says so.</p>
      ) : (
        <p className="opened-source">
          Indian labels only have to say this where safety demands it.
        </p>
      )}

      {bestBefore ? (
        <p className="opened-bb">
          <span className="opened-bb-date">{bestBefore}</span>
          <span className="opened-bb-note">
            {' '}— that date is for the sealed pack. Once it is open, it no longer
            answers the question.
          </span>
        </p>
      ) : null}

      {whyItChanges ? <p className="opened-why">{whyItChanges}</p> : null}

      {keepIn ? (
        <p className="opened-keep">
          <span>Keep it in</span>
          <strong>{keepIn}</strong>
        </p>
      ) : null}
    </section>
  )
}

/**
 * How many packets this family has scanned that bothered to say anything about
 * after opening.
 *
 * This counts what the PACKS said, never what the family did. Palat does not
 * know when anyone opened anything and is not trying to find out — the number is
 * a fact about the shelf, not about the kitchen.
 *
 * It sits inside the card rather than on the report on purpose. "This pack
 * doesn't say" is a shrug on its own; "this pack doesn't say, and nor did
 * sixteen of the last twenty" is the moment you realise it is the category, not
 * the packet.
 *
 * Nothing shows until there are three readable scans, because "1 of 1" is not a
 * finding, it is an accident.
 */
