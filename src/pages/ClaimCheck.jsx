import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import { prepareImage } from '../lib/image.js'
import { checkClaims, isDemoMode } from '../lib/api.js'
import PersonTabs from '../components/PersonTabs.jsx'
import VerdictCard from '../components/VerdictCard.jsx'
import LabelSheet from '../components/LabelSheet.jsx'
import ClaimList from '../components/ClaimList.jsx'
import WhatItIs from '../components/WhatItIs.jsx'

/**
 * Front against back, for ONE product.
 *
 * Deliberately not part of Scan. A scan answers "can my family eat this" from the
 * back of the pack. This page answers a different question — "is this pack telling
 * me the truth" — and it needs something a scan never asks for: the front,
 * photographed on purpose, so the claim can be quoted rather than hoped for.
 * Keeping them apart means neither flow has to explain the other.
 */
export default function ClaimCheck() {
  const { family, activeId, setActiveId, recordScan } = usePalat()

  const [front, setFront] = useState(null)
  const [back, setBack] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | reading | done
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const frontInput = useRef(null)
  const backInput = useRef(null)

  const busy = phase === 'reading'
  const ready = !!front && !!back

  async function take(event, which) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      const image = await prepareImage(file)
      if (which === 'front') setFront(image)
      else setBack(image)
    } catch (err) {
      setError(err.message)
    }
  }

  async function run() {
    if (!ready || busy) return
    setError('')
    setPhase('reading')
    try {
      const data = await checkClaims({ front, back, people: family })
      setResult(data)
      recordScan({ ...data, photo: back?.dataUrl || front?.dataUrl, at: Date.now() })
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhase('idle')
    }
  }

  function reset() {
    setFront(null)
    setBack(null)
    setResult(null)
    setPhase('idle')
    setError('')
  }

  const checks = result?.claimChecks || []
  const nameCheck = result?.nameCheck
  const label = result?.label
  const activeVerdict = result?.verdicts.find((v) => v.personId === activeId)
  const activePerson = family.find((p) => p.id === activeId)

  if (!family.length) {
    return (
      <div className="page">
        <h1 className="page-title">Claim check</h1>
        <Link to="/family" className="empty empty--link">
          <strong>Set up the family first.</strong>
          <span>
            Palat can call out a false claim on its own, but the portion it gives
            you only means something once it knows who is eating.
          </span>
        </Link>
      </div>
    )
  }

  return (
    <div className="page page--claim">
      <header className="page-head">
        <div>
          <h1 className="page-title">Claim check</h1>
          <p className="page-sub">
            One product, both sides. The front is written to sell it, the back is
            written because the law says so. Photograph both and see the gap.
          </p>
        </div>
        {result ? (
          <button type="button" className="ghost" onClick={reset}>
            Check another
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {!result ? (
        <>
          <div className="sides">
            <Side
              kind="front"
              title="Front of pack"
              hint="The claim — sugar free, multigrain, high protein"
              image={front}
              onPick={() => frontInput.current?.click()}
              onClear={() => setFront(null)}
            />
            <span className="sides-vs" aria-hidden="true">
              vs
            </span>
            <Side
              kind="back"
              title="Back of pack"
              hint="The truth — ingredient list and nutrition table"
              image={back}
              onPick={() => backInput.current?.click()}
              onClear={() => setBack(null)}
            />
          </div>

          <button type="button" className="wide-go" disabled={!ready || busy} onClick={run}>
            {busy
              ? 'Reading both sides…'
              : ready
                ? 'Compare the two sides'
                : front || back
                  ? `Add the ${front ? 'back' : 'front'} to compare`
                  : 'Add both sides to compare'}
          </button>

          {isDemoMode() ? (
            <p className="page-note">
              Demo mode is on — the comparison will be a frozen reading, not Gemini.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="sides sides--done">
            <figure className="shot">
              <img src={front?.dataUrl} alt="Front of the pack" />
              <figcaption>Front</figcaption>
            </figure>
            <span className="sides-vs" aria-hidden="true">
              vs
            </span>
            <figure className="shot">
              <img src={back?.dataUrl} alt="Back of the pack" />
              <figcaption>Back</figcaption>
            </figure>
          </div>

          <WhatItIs check={nameCheck} />

          {checks.length ? (
            <ClaimList checks={checks} />
          ) : (
            <section className="claim claim--clean">
              <header className="claim-head">
                <span className="claim-badge">No claims to check</span>
              </header>
              <p className="claim-row">
                <strong className="claim-value">
                  Nothing on the front of this pack makes a claim the ingredient
                  list can be held against.
                </strong>
              </p>
              <p className="claim-note">
                Read the portion below anyway — a pack with nothing to prove can
                still be wrong for one person.
              </p>
            </section>
          )}

          {label?.servingsPerPack && label.servingsPerPack !== '—' ? (
            <section className="packsays">
              <span className="packsays-label">The pack already told you</span>
              <strong className="packsays-value">{label.servingsPerPack}</strong>
              <p className="packsays-note">
                Printed next to the nutrition table, where nobody reads it. Families
                eat the packet; the pack was talking about a serving.
              </p>
            </section>
          ) : null}

          <div className="result-head">
            <div>
              <p className="result-name">{label?.productName || 'This packet'}</p>
              <p className="result-meta">{label?.brand || ''}</p>
            </div>
          </div>

          <PersonTabs
            people={family}
            verdicts={result.verdicts}
            activeId={activeId}
            onSelect={setActiveId}
          />

          <VerdictCard
            person={activePerson}
            verdict={activeVerdict}
            productName={label?.productName}
          />

          <LabelSheet label={result.label} findings={result.findings} />
        </>
      )}

      <input
        ref={frontInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => take(e, 'front')}
        hidden
      />
      <input
        ref={backInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => take(e, 'back')}
        hidden
      />

      <p className="disclaimer">
        Palat reads labels. It does not diagnose. For medicines and dosage, check
        with your doctor.
      </p>
    </div>
  )
}

function Side({ kind, title, hint, image, onPick, onClear }) {
  return (
    <div className={'side side--' + kind + (image ? ' side--filled' : '')}>
      <button type="button" className="side-btn" onClick={onPick}>
        {image ? (
          <img src={image.dataUrl} alt={title} />
        ) : (
          <span className="side-empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
              <path d="M12 9v6M9 12h6" />
            </svg>
            <strong>{title}</strong>
            <span>{hint}</span>
          </span>
        )}
      </button>
      {image ? (
        <div className="side-foot">
          <strong>{title}</strong>
          <button type="button" className="linkish" onClick={onClear}>
            Retake
          </button>
        </div>
      ) : null}
    </div>
  )
}
