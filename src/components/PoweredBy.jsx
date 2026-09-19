import Sparkle from './Sparkle.jsx'

/**
 * Credits the engine without claiming Google made the app. "Built with" rather
 * than "by": Palat is not a Google product, and implying otherwise would be a
 * brand claim we have no right to make.
 */
export default function PoweredBy({ className = '' }) {
  return (
    <p className={'powered ' + className}>
      <Sparkle size={14} />
      <span>
        Built with <strong>Gemini</strong>
      </span>
    </p>
  )
}
