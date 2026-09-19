import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import { prepareImage } from '../lib/image.js'
import { analyzeLabel, analyzeBatch, isDemoMode, MAX_IMAGES } from '../lib/api.js'
import ScanStage from '../components/ScanStage.jsx'
import PersonTabs from '../components/PersonTabs.jsx'
import VerdictCard from '../components/VerdictCard.jsx'
import LabelSheet from '../components/LabelSheet.jsx'
import DishList from '../components/DishList.jsx'
import Compare from '../components/Compare.jsx'
import BatchResults from '../components/BatchResults.jsx'
import SeenCard from '../components/SeenCard.jsx'
import ClaimList from '../components/ClaimList.jsx'
import WhatItIs from '../components/WhatItIs.jsx'

export default function Scan() {
  const {
    family, activeId, setActiveId, lastScan, setLastScan,
    addToSafeList, onSafeList, recordScan,
  } = usePalat()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'plate' ? 'plate' : 'label'

  const [photo, setPhoto] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | prep | reading | done
  const [error, setError] = useState('')

  // Several packets read in one go, when more than one photo is chosen.
  const [batch, setBatch] = useState(null)
  const [pending, setPending] = useState(1)
  // The packet being compared against, once you ask to compare.
  const [rival, setRival] = useState(null)
  const [comparing, setComparing] = useState(false)
  const cameraInput = useRef(null)
  const fileInput = useRef(null)

  const result = phase === 'done' ? lastScan : null
  const showingBatch = phase === 'done' && batch && !result
  const showCapture = (!result && !showingBatch) || comparing
  const busy = phase === 'prep' || phase === 'reading'

  // A result from a previous visit is still on screen when you come back.
  useEffect(() => {
    if (lastScan && phase === 'idle') {
      setPhase('done')
      setPhoto(lastScan.photo || null)
    }
    // Only on mount: later changes are driven by scanning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const status = useMemo(() => {
    const many = pending > 1
    const prep = many ? `Getting ${pending} photos ready…` : 'Getting the photo ready…'

    if (phase === 'prep') return [{ text: prep, done: false }]
    if (phase === 'reading')
      return [
        { text: prep, done: true },
        {
          text: many
            ? `Reading ${pending} labels…`
            : mode === 'plate'
              ? 'Working out what is on the plate…'
              : 'Reading the label in this light…',
          done: false,
        },
      ]
    if (phase === 'done' && result) return finishedStatus(result, family.length, mode)
    return []
  }, [phase, result, family.length, mode, pending])

  async function run(file) {
    setError('')
    setPending(1)
    setPhase('prep')
    try {
      const image = file
        ? await prepareImage(file)
        : { dataUrl: null, base64: null, mimeType: null }
      setPhoto(image.dataUrl)
      setPhase('reading')

      const data = await analyzeLabel({
        base64: image.base64,
        mimeType: image.mimeType,
        people: family,
        mode,
      })
      const scan = { ...data, photo: image.dataUrl, at: Date.now() }

      if (comparing) {
        setRival(scan)
        setComparing(false)
      } else {
        setLastScan(scan)
      }
      recordScan(scan)
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhase('idle')
      if (comparing) setComparing(false)
      else setPhoto(null)
    }
  }

  async function runBatch(files) {
    setError('')
    setPhase('prep')
    setBatch(null)
    setLastScan(null)
    setPending(files.length)
    try {
      const images = []
      for (const file of files) images.push(await prepareImage(file))
      setPhoto(images[0].dataUrl)
      setPhase('reading')

      const products = await analyzeBatch({ images, people: family })
      setBatch(products)
      products.filter((p) => !p.failed).forEach(recordScan)
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhoto(null)
      setPhase('idle')
    }
  }

  const pick = (event) => {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return

    if (files.length === 1) return run(files[0])

    if (files.length > MAX_IMAGES) {
      setError(
        `That is ${files.length} photos. Palat reads up to ${MAX_IMAGES} packets at a time — pick fewer.`
      )
      return
    }
    runBatch(files)
  }

  const reset = () => {
    setLastScan(null)
    setBatch(null)
    setRival(null)
    setComparing(false)
    setPhoto(null)
    setPhase('idle')
    setError('')
  }

  const startCompare = () => {
    setComparing(true)
    setPhase('idle')
    setError('')
  }

  const activeVerdict = result?.verdicts.find((v) => v.personId === activeId)
  const activePerson = family.find((p) => p.id === activeId)
  const productName = result?.label.productName || 'This packet'
  const packetListed = result ? onSafeList(productName, 'packet', activeId) : false

  if (!family.length) {
    return (
      <div className="page">
        <h1 className="page-title">Scan</h1>
        <Link to="/family" className="empty empty--link">
          <strong>Set up the family first.</strong>
          <span>Palat needs to know who is eating before a scan means anything.</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="page page--scan">
      <header className="page-head">
        <h1 className="page-title">{mode === 'plate' ? 'Scan a plate' : 'Scan a packet'}</h1>
        {result || showingBatch ? (
          <button type="button" className="ghost" onClick={reset}>
            New scan
          </button>
        ) : null}
      </header>

      {!result && !showingBatch && !comparing ? (
        <div className="modes" role="tablist" aria-label="What are you scanning">
          <button
            role="tab"
            aria-selected={mode === 'label'}
            className={'mode' + (mode === 'label' ? ' mode--on' : '')}
            onClick={() => setParams({})}
          >
            Back of a packet
          </button>
          <button
            role="tab"
            aria-selected={mode === 'plate'}
            className={'mode' + (mode === 'plate' ? ' mode--on' : '')}
            onClick={() => setParams({ mode: 'plate' })}
          >
            A plate of food
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {showCapture ? (
        <>
          {comparing ? (
            <p className="compare-lead">
              Now photograph the other packet. Palat will put them side by side.
            </p>
          ) : null}
          <ScanStage photo={photo} scanning={busy} status={status} mode={mode} />
          <div className="shutter-row">
            <button
              type="button"
              className="shutter"
              disabled={busy}
              onClick={() => (isDemoMode() ? run(null) : cameraInput.current?.click())}
              aria-label="Capture"
            >
              <span className={busy ? 'shutter-dot shutter-dot--busy' : 'shutter-dot'} />
            </button>
            <span className="shutter-hint">
              {busy
                ? 'Reading…'
                : isDemoMode()
                  ? 'Tap to run the frozen reading'
                  : 'Tap to capture'}
            </span>
            {!busy && !isDemoMode() ? (
              <button type="button" className="linkish" onClick={() => fileInput.current?.click()}>
                {comparing
                  ? 'or choose a photo'
                  : `or choose photos — up to ${MAX_IMAGES} packets at once`}
              </button>
            ) : null}
          </div>
        </>
      ) : showingBatch ? (
        <>
          <div className="result-head">
            <div>
              <p className="result-name">
                {batch.length} packets read
              </p>
              <p className="result-meta">Sorted best first for whoever is selected</p>
            </div>
          </div>

          <PersonTabs
            people={family}
            verdicts={[]}
            activeId={activeId}
            onSelect={setActiveId}
          />

          <BatchResults
            products={batch}
            person={activePerson}
            onOpen={(row) => {
              setLastScan(row)
              setPhoto(row.photo)
            }}
          />
        </>
      ) : (
        <>
          {batch ? (
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setLastScan(null)
                setRival(null)
              }}
            >
              ← back to all {batch.length}
            </button>
          ) : null}

          <div className="result-head">
            {photo ? <img className="result-thumb" src={photo} alt="" /> : null}
            <div>
              <p className="result-name">{productName}</p>
              <p className="result-meta">
                {result.label.brand || (result.label.isEstimate ? 'Estimate — no label' : '')}
              </p>
            </div>
          </div>

          {status.length ? (
            <ul className="status status--receipt">
              {status.map((s) => (
                <li key={s.text} className="is-done">
                  <span className="status-dot">✓</span>
                  {s.text}
                </li>
              ))}
            </ul>
          ) : null}

          <WhatItIs check={result.nameCheck} />

          {result.claimChecks?.length ? (
            <ClaimList checks={result.claimChecks} compact />
          ) : null}

          {result.mode === 'plate' ? <SeenCard seen={result.seen} /> : null}

          <PersonTabs
            people={family}
            verdicts={result.verdicts}
            activeId={activeId}
            onSelect={setActiveId}
          />

          <VerdictCard
            person={activePerson}
            verdict={activeVerdict}
            productName={productName}
          />

          {result.dishes?.length ? (
            <DishList dishes={result.dishes} personId={activeId} />
          ) : null}

          {result.mode !== 'plate' && activePerson ? (
            <Compare
              person={activePerson}
              a={result}
              b={rival}
              comparing={comparing}
              onStart={startCompare}
              onClear={() => setRival(null)}
            />
          ) : null}

          {result.mode !== 'plate' ? (
            <button
              type="button"
              className={'wide-add' + (packetListed ? ' wide-add--done' : '')}
              disabled={packetListed}
              onClick={() =>
                addToSafeList({
                  name: productName,
                  kind: 'packet',
                  forPersonId: activeId,
                  forPerson: activePerson?.name,
                  note: result.label.brand || '',
                  verdicts: Object.fromEntries(
                    result.verdicts.map((v) => [v.personId, v.verdict])
                  ),
                })
              }
            >
              {packetListed
                ? `On ${activePerson?.name}'s list ✓`
                : `Put this packet on ${activePerson?.name}'s list anyway`}
            </button>
          ) : null}

          <LabelSheet label={result.label} findings={result.findings} />
        </>
      )}

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={pick}
        hidden
      />
      <input ref={fileInput} type="file" accept="image/*" multiple onChange={pick} hidden />

      <p className="disclaimer">
        Palat reads labels. It does not diagnose. For medicines and dosage, check
        with your doctor.
      </p>
    </div>
  )
}

/**
 * The finished status list is built from what actually came back, not from a
 * script — if nothing was flagged, no line claims anything was.
 */
function finishedStatus(result, peopleCount, mode) {
  const lines = []

  if (mode === 'plate') {
    lines.push({
      text: (result.dishes?.length || 0) + ' dishes identified on the plate',
      done: true,
    })
  } else if (result.label.ingredients?.length) {
    lines.push({ text: 'Ingredients and nutrition table found', done: true })
  } else {
    lines.push({ text: 'No ingredient list could be read', done: true })
  }

  const sugary = result.findings.find(
    (f) => f.category === 'sugar-alcohol' || f.category === 'hidden-sugar'
  )
  if (sugary) {
    const term = sugary.term.charAt(0).toUpperCase() + sugary.term.slice(1)
    lines.push({ text: `${term} flagged — sugar hides under 20 names`, done: true })
  }

  const tightened = result.verdicts.filter((v) => v.guarded).length
  if (tightened) {
    lines.push({
      text: `${tightened} verdict${tightened > 1 ? 's' : ''} tightened by Palat's own checks`,
      done: true,
    })
  }

  lines.push({
    text: `Checked against ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} at home`,
    done: true,
  })

  return lines
}
