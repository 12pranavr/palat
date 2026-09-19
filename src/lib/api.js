import { scanIngredients, findClaimGap, guardVerdict } from './guardrails.js'
import {
  DEMO_LABEL,
  DEMO_CLAIM_LABEL,
  DEMO_CLAIM_VERDICTS,
  DEMO_VERDICTS,
  DEMO_PLATE,
  DEMO_FAMILY,
} from '../data/demoFixture.js'

// Read once, from the URL the app was opened with, then remembered for the rest
// of the session. Client-side navigation drops the query string, and demo mode
// silently switching off halfway through a walkthrough is worse than useless.
const DEMO_KEY = 'palat.demo'

const demo = (() => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('demo')
    if (fromUrl === '1') {
      sessionStorage.setItem(DEMO_KEY, '1')
      return true
    }
    if (fromUrl === '0') {
      sessionStorage.removeItem(DEMO_KEY)
      return false
    }
    return sessionStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return new URLSearchParams(window.location.search).get('demo') === '1'
  }
})()

export const isDemoMode = () => demo

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || 'That did not go through. Try again.')
  return payload
}

/**
 * One photo, one call, every person's verdict — so switching between people in
 * the aisle is instant rather than three round trips.
 */
export async function analyzeLabel({ base64, mimeType, people, mode = 'label' }) {
  let payload

  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 2200))
    payload =
      mode === 'plate'
        ? DEMO_PLATE
        : { label: DEMO_LABEL, dishes: [], verdicts: DEMO_VERDICTS }
  } else {
    payload = await post('/api/analyze', {
      imageBase64: base64,
      mimeType,
      people,
      mode,
    })
  }

  const label = payload.label || {}
  const findings = scanIngredients(label.ingredients)
  const claimGap = resolveClaimGap(label, findings)

  const verdicts = people.map((person) => {
    const raw = (payload.verdicts || []).find((v) => v.personId === person.id) || {
      personId: person.id,
      verdict: 'SOMETIMES',
      headline: 'Could not read this one for ' + person.name,
      reason: 'The label did not come through clearly enough to be sure.',
      portion: '?',
      portionUnit: 'not readable',
      packSays: '—',
      better: '—',
      keyNumbers: [],
    }
    // In plate mode the ingredient list is dish names, so the guardrails have
    // nothing reliable to scan — leave the reading as Gemini gave it.
    return mode === 'plate'
      ? { ...raw, guarded: false }
      : guardVerdict(raw, person, findings, label.nutritionPer100g)
  })

  return {
    label,
    findings,
    claimGap,
    verdicts,
    dishes: payload.dishes || [],
    seen: payload.seen || null,
    mode,
  }
}

/**
 * Two ways to catch a misleading front, in order of how much they can be trusted.
 *
 * The client-side rules are deterministic: they only fire when a claim word and a
 * matching ingredient are both actually present, so they cannot invent a gap. But
 * they only know the handful of patterns written into them, and they depend on the
 * claim happening to be readable in the photo.
 *
 * When the front of the pack has been photographed deliberately (the claim-check
 * page), Gemini can see the claim and the ingredient list side by side and catches
 * the ones no rule anticipated — "high protein" on six grams, "made with real
 * fruit" on one percent. So prefer its finding when it made one, and fall back to
 * the rules otherwise.
 */
function resolveClaimGap(label = {}, findings = []) {
  const said = (v) => v && v !== '—' && String(v).trim()
  const model = label.claimCheck
  if (model && said(model.claim) && said(model.reality)) {
    return { claim: model.claim, truth: model.reality, fromModel: true }
  }
  return findClaimGap(label.frontClaims, findings)
}

export const MAX_PANELS = 4

/**
 * One product, photographed front and back, read as a single label.
 *
 * Deliberately not part of scanning: a scan is "read this packet for my family",
 * this is "is this pack telling me the truth". Same endpoint, different question,
 * and the answer people want back is the claim, not the verdict.
 */
export async function checkClaims({ front, back, extra = [], people }) {
  const panels = [
    front && { ...front, side: 'front' },
    back && { ...back, side: 'back' },
    ...extra.map((e) => ({ ...e, side: 'other' })),
  ].filter(Boolean)

  let payload
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 2000))
    payload = { label: DEMO_CLAIM_LABEL, dishes: [], verdicts: DEMO_CLAIM_VERDICTS }
  } else {
    payload = await post('/api/analyze', {
      images: panels.map((p) => ({
        base64: p.base64,
        mimeType: p.mimeType,
        side: p.side,
      })),
      people,
      mode: 'label',
    })
  }

  const label = payload.label || {}
  const findings = scanIngredients(label.ingredients)

  const verdicts = people.map((person) => {
    const raw = (payload.verdicts || []).find((v) => v.personId === person.id) || {
      personId: person.id,
      verdict: 'SOMETIMES',
      headline: 'Could not read this one for ' + person.name,
      reason: 'The label did not come through clearly enough to be sure.',
      portion: '?',
      portionUnit: 'not readable',
      packSays: '—',
      better: '—',
      keyNumbers: [],
    }
    return guardVerdict(raw, person, findings, label.nutritionPer100g)
  })

  return {
    label,
    findings,
    claimGap: resolveClaimGap(label, findings),
    verdicts,
    dishes: [],
    seen: null,
    mode: 'label',
    panels: panels.map((p) => ({ side: p.side, dataUrl: p.dataUrl })),
  }
}

export const MAX_IMAGES = 5

/**
 * Several packets in one go. One call for all of them, then each product gets the
 * same guardrail treatment a single scan would.
 */
export async function analyzeBatch({ images, people }) {
  let payload

  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 2600))
    payload = {
      products: images.map(() => ({ label: DEMO_LABEL, verdicts: DEMO_VERDICTS })),
    }
  } else {
    payload = await post('/api/batch', {
      images: images.map((i) => ({ base64: i.base64, mimeType: i.mimeType })),
      people,
    })
  }

  return (payload.products || []).map((product, i) => {
    if (!product) {
      return { failed: true, photo: images[i]?.dataUrl || null, index: i }
    }

    const label = product.label || {}
    const findings = scanIngredients(label.ingredients)

    return {
      index: i,
      photo: images[i]?.dataUrl || null,
      label,
      findings,
      claimGap: findClaimGap(label.frontClaims, findings),
      mode: 'label',
      dishes: [],
      verdicts: people.map((person) => {
        const raw = (product.verdicts || []).find((v) => v.personId === person.id) || {
          personId: person.id,
          verdict: 'SOMETIMES',
          headline: 'Could not read this one for ' + person.name,
          reason: 'That label did not come through clearly enough to be sure.',
          portion: '?',
          portionUnit: 'not readable',
          packSays: '—',
          better: '—',
          keyNumbers: [],
        }
        return guardVerdict(raw, person, findings, label.nutritionPer100g)
      }),
    }
  })
}

/**
 * One food question about one person, grounded in their profile, the packets
 * already scanned, and the cart. One call, no thread — the answer stands alone.
 */
export async function askAbout({ question, person, history, cart }) {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 1400))
    return {
      answer:
        `Demo mode is on, so this is a canned reply rather than Gemini. ` +
        `In a real answer Palat would use ${person.name}'s profile and the packets you have scanned.`,
      kind: 'answered',
      basedOn: ['demo mode'],
    }
  }

  return post('/api/ask', {
    question,
    person,
    // Only what this person was actually judged on, and only recent.
    history: (history || []).slice(0, 25),
    cart: (cart || []).map((i) => ({ name: i.name })),
  })
}

/**
 * "Dadaji, 72, diabetes and BP, takes metformin." → profile cards.
 * Optionally reads a prescription photo alongside the words.
 *
 * The prescription image is sent once and never stored: only the fields Gemini
 * pulled out of it are kept, and only after you confirm them.
 */
export async function parseFamily({ text, image, answers, existing } = {}) {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 1200))
    return { people: DEMO_FAMILY, updates: [], clarify: [], note: '', readPrescription: false }
  }

  const payload = await post('/api/family', {
    text,
    imageBase64: image?.base64,
    mimeType: image?.mimeType,
    answers,
    existing: (existing || []).map((p) => ({
      id: p.id, name: p.name, age: p.age,
      conditions: p.conditions, goals: p.goals, medications: p.medications,
    })),
  })

  return {
    people: payload.people || [],
    updates: payload.updates || [],
    clarify: payload.clarify || [],
    note: payload.note || '',
    readPrescription: !!payload.readPrescription,
  }
}
