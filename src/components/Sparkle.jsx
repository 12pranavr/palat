let seed = 0

/** The four-point Gemini spark, gradient-filled. */
export default function Sparkle({ size = 24 }) {
  const id = 'sparkle-' + (seed += 1)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="sparkle">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4893FF" />
          <stop offset="52%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M12 0c0 6.6 5.4 12 12 12-6.6 0-12 5.4-12 12 0-6.6-5.4-12-12-12C6.6 12 12 6.6 12 0z"
        fill={`url(#${id})`}
      />
    </svg>
  )
}
