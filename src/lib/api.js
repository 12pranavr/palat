import { scanIngredients, findClaimGaps, findNameGap, guardVerdict } from './guardrails.js'
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
  const claimChecks = resolveClaimChecks(label, findings)

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
    claimChecks,
    nameCheck: resolveNameCheck(label),
    openedCheck: resolveOpenedCheck(label, findings),
    claimGap: worstClaim(claimChecks),
    verdicts,
    dishes: payload.dishes || [],
    seen: payload.seen || null,
    mode,
  }
}

/**
 * Two ways to catch a misleading front, merged rather than chosen between.
 *
 * Gemini can see the whole front and enumerate claims no rule anticipated —
 * "lactose free", "source of protein", a product name that is itself a claim.
 * The rules in guardrails.js know fewer patterns but cannot be talked out of the
 * ones they know, and cannot soften. So Gemini supplies the breadth and the
 * rules are the floor underneath it: anything they prove and Gemini missed gets
 * appended rather than lost.
 *
 * Sorted worst-first, because the failures are what someone in an aisle has
 * three seconds for — but the claims that hold up stay on the list underneath,
 * so the read is visibly a check and not a hunt.
 */
const CLAIM_RANK = { misleading: 0, technically: 1, holds: 2 }

const normaliseClaim = (c) =>
  String(c || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** "Sugar free" and "SUGAR FREE Cookies" are the same claim twice. */
function sameClaim(a, b) {
  const x = normaliseClaim(a)
  const y = normaliseClaim(b)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

export function resolveClaimChecks(label = {}, findings = []) {
  const said = (v) => v && v !== '—' && String(v).trim()

  const fromModel = (label.claimChecks || [])
    .filter((c) => c && said(c.claim) && said(c.reality))
    .map((c) => ({
      claim: String(c.claim).trim(),
      verdict: CLAIM_RANK[c.verdict] != null ? c.verdict : 'technically',
      reality: String(c.reality).trim(),
      fromRules: false,
    }))

  const merged = [...fromModel]
  for (const rule of findClaimGaps(label.frontClaims, findings, label)) {
    if (merged.some((m) => sameClaim(m.claim, rule.claim))) continue
    merged.push(rule)
  }

  return merged.sort((a, b) => CLAIM_RANK[a.verdict] - CLAIM_RANK[b.verdict])
}

/**
 * What the pack actually is, versus what it is called.
 *
 * The ratio and the percentages come from the label itself — arithmetic, not
 * judgement, so they cannot drift. The sentence around them comes from Gemini,
 * which can phrase it for a person who does not read labels. If the model says
 * nothing but the numbers prove a gap, the numbers still get their say.
 */
export function resolveNameCheck(label = {}) {
  const said = (v) => v && v !== '—' && String(v).trim()
  const measured = findNameGap(label)
  const model = label.nameCheck || {}

  if (!measured && !said(model.honestName)) return null

  const times = measured?.times
  const fallback = measured
    ? `${measured.hero} is ${measured.heroPercent}% of this. ` +
      (times
        ? `There is about ${times} times more ${measured.dominant.toLowerCase()} in it than ${measured.hero.toLowerCase()}.`
        : `${measured.dominant} is the main ingredient.`)
    : ''

  return {
    honestName: said(model.honestName) || null,
    namedAfter:
      said(model.namedAfter) ||
      (measured ? `${measured.hero} (${measured.heroPercent}%)` : null),
    actuallyMostly:
      said(model.actuallyMostly) ||
      (measured
        ? measured.dominantPercent != null
          ? `${measured.dominant} (${measured.dominantPercent}%)`
          : measured.dominant
        : null),
    plainly: said(model.plainly) || fallback || null,
    times: times || null,
    // The ratio is measured against these two specifically, so the sentence has
    // to name them and not the prose fields, which may list several ingredients.
    heroTerm: measured?.hero || null,
    dominantTerm: measured?.dominant || null,
  }
}

/**
 * What happens once the seal is broken.
 *
 * The best-before date on a pack describes a pack nobody has opened. Families
 * read it as the answer for the half-eaten packet in the kitchen, and it is not
 * the answer to that question at all. In India a post-opening instruction is
 * only required where health and safety demand one, so ketchup and juice carry
 * it and a biscuit packet usually does not.
 *
 * Two jobs, and only two. Quote the instruction when the pack gives one. Name
 * the silence when it does not.
 *
 * What this must never do is fill the silence with a number. Palat photographed
 * a label, not a kitchen — it has no idea when this packet was opened, and the
 * research on secondary shelf life finds that even manufacturers' own declared
 * periods are frequently unsupported. A number invented here would be exactly
 * the kind of fabrication that makes the maltitol finding worth believing, so
 * the period is stripped unless the model said it read one off the pack.
 */
export function resolveOpenedCheck(label = {}, findings = []) {
  const said = (v) => v && v !== '—' && String(v).trim()
  const model = label.openedCheck || {}

  const printed = !!model.printed && !!said(model.afterOpening)
  const bestBefore = said(model.bestBefore) || null

  // Nothing read, nothing printed, nothing worth saying.
  if (!printed && !bestBefore && !said(model.whyItChanges)) return null

  // Fat is what turns first once air gets in, and it is the one reason Palat can
  // stand behind from the ingredient list alone rather than taking the model's
  // word for it.
  const fat = findings.find((f) => f.category === 'bad-fat')
  const fallbackWhy = fat
    ? `${capitalise(fat.term)} is in this, and fat is what turns first once air gets to it.`
    : null

  return {
    printed,
    // Guarded deliberately: if the model did not claim to have READ an
    // instruction, no period survives, whatever it wrote in the field.
    afterOpening: printed ? said(model.afterOpening) : null,
    bestBefore,
    whyItChanges: said(model.whyItChanges) || fallbackWhy,
    keepIn: said(model.keepIn) || null,
  }
}

function capitalise(w) {
  return String(w).charAt(0).toUpperCase() + String(w).slice(1)
}

/** The single worst claim, for places that only have room for one line. */
export function worstClaim(checks = []) {
  return checks.find((c) => c.verdict !== 'holds') || null
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
    claimChecks: resolveClaimChecks(label, findings),
    nameCheck: resolveNameCheck(label),
    openedCheck: resolveOpenedCheck(label, findings),
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
      claimChecks: resolveClaimChecks(label, findings),
      nameCheck: resolveNameCheck(label),
      openedCheck: resolveOpenedCheck(label, findings),
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
