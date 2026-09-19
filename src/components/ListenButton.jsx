import { useEffect, useRef, useState } from 'react'

/**
 * Reads a verdict out loud.
 *
 * This is not an accessibility afterthought — it is the feature for the person
 * Palat was built for. The grandmother who could not read the 6pt ingredient list
 * in the first place is not going to read a card about it either. Someone holds
 * the phone up and she hears the answer.
 *
 * Speech synthesis is genuinely absent on some browsers and silently broken on
 * others, so the button renders only when the API exists, and any failure just
 * puts the button back rather than showing an error nobody can act on.
 */
const supported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

/** Prefer an Indian English voice when the device has one — the food names land better. */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices() || []
  return (
    voices.find((v) => v.lang === 'en-IN') ||
    voices.find((v) => v.lang?.startsWith('en-IN')) ||
    voices.find((v) => v.lang?.startsWith('en-GB')) ||
    voices.find((v) => v.lang?.startsWith('en')) ||
    null
  )
}

export default function ListenButton({ text, label = 'Listen', className = '' }) {
  const [speaking, setSpeaking] = useState(false)
  const [can, setCan] = useState(false)
  const utterRef = useRef(null)

  useEffect(() => {
    if (!supported()) return
    setCan(true)
    // Voices load asynchronously on Chrome; touching the list primes it.
    window.speechSynthesis.getVoices()
    const onVoices = () => window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoices)
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices)
      window.speechSynthesis.cancel()
    }
  }, [])

  // Moving to another person mid-sentence should stop the old one.
  useEffect(() => {
    if (!supported()) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [text])

  if (!can || !text) return null

  const stop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const speak = () => {
    if (speaking) return stop()
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const voice = pickVoice()
      if (voice) u.voice = voice
      u.lang = voice?.lang || 'en-IN'
      // Slightly under natural pace: this is read to someone across a shop counter.
      u.rate = 0.95
      u.pitch = 1
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      utterRef.current = u
      window.speechSynthesis.speak(u)
      setSpeaking(true)
    } catch {
      setSpeaking(false)
    }
  }

  return (
    <button
      type="button"
      className={'listen' + (speaking ? ' listen--on' : '') + (className ? ' ' + className : '')}
      onClick={speak}
      aria-label={speaking ? 'Stop reading aloud' : label}
      title={speaking ? 'Stop' : 'Listen'}
    >
      {speaking ? <StopIcon /> : <SpeakerIcon />}
      <span>{speaking ? 'Stop' : 'Listen'}</span>
    </button>
  )
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 9.5h3L12 6v12l-4-3.5H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.5 7.5 0 0 1 0 10.4" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
