// Comparing two packets does not need Gemini again. Both readings are already in
// hand, so the comparison is arithmetic — which means it is free, instant, and
// can always say exactly why it picked one.

const RANK = { YES: 0, SOMETIMES: 1, NO: 2 }

const numberFrom = (value) => {
  if (value == null) return null
  const m = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

const has = (person, ...words) =>
  (person.conditions || []).some((c) => words.some((w) => c.toLowerCase().includes(w)))

const wants = (person, ...words) =>
  (person.goals || []).some((g) => words.some((w) => g.toLowerCase().includes(w)))

/** Which flagged ingredients actually matter for this person. */
function problemsFor(person, findings = []) {
  const diabetic = has(person, 'diabet', 'sugar', 'prediabet')
  const bp = has(person, 'blood pressure', 'bp', 'hypertens')
  const heart = has(person, 'heart', 'cholesterol', 'cardiac', 'lipid')
  const slimming = wants(person, 'lose weight', 'weight loss', 'slim', 'reduce weight')

  return findings.filter((f) => {
    if (diabetic && ['hidden-sugar', 'sugar-alcohol', 'refined-carb'].includes(f.category))
      return true
    if ((bp || heart) && f.category === 'bad-fat') return true
    if (slimming && f.category === 'bad-fat') return true
    return false
  })
}

const name = (scan) => scan?.label?.productName || 'that packet'

/**
 * Compare two scans for one person. Returns which to pick and the one line that
 * justifies it — always a fact off the labels, never a vague "healthier".
 */
export function compareFor(person, a, b) {
  const va = a.verdicts.find((v) => v.personId === person.id)
  const vb = b.verdicts.find((v) => v.personId === person.id)
  if (!va || !vb) return null

  const pick = (winner, reason) => ({
    winner,
    reason,
    verdictA: va.verdict,
    verdictB: vb.verdict,
  })

  // 1. A straight verdict difference settles it.
  if (RANK[va.verdict] !== RANK[vb.verdict]) {
    const aWins = RANK[va.verdict] < RANK[vb.verdict]
    const loser = aWins ? b : a
    const loserV = aWins ? vb : va
    return pick(
      aWins ? 'a' : 'b',
      loserV.verdict === 'NO'
        ? `${name(loser)} is a straight no for ${person.name}.`
        : `${name(loser)} is the more cautious one for ${person.name}.`
    )
  }

  // 2. Same verdict — count the things that actually matter for this person.
  const pa = problemsFor(person, a.findings)
  const pb = problemsFor(person, b.findings)

  const promA = pa.filter((f) => f.prominent).length
  const promB = pb.filter((f) => f.prominent).length
  if (promA !== promB) {
    const aWins = promA < promB
    const worst = (aWins ? pb : pa).find((f) => f.prominent)
    return pick(
      aWins ? 'a' : 'b',
      `${name(aWins ? b : a)} has ${worst.term} in its first three ingredients.`
    )
  }

  if (pa.length !== pb.length) {
    const aWins = pa.length < pb.length
    const extra = aWins ? pb : pa
    return pick(
      aWins ? 'a' : 'b',
      `${name(aWins ? b : a)} carries ${extra.length} flagged ingredient${extra.length > 1 ? 's' : ''} against ${Math.min(pa.length, pb.length)}.`
    )
  }

  // 3. Still level — fall back to the number that matters most to this person.
  const bp = has(person, 'blood pressure', 'bp', 'hypertens')
  if (bp) {
    const sa = numberFrom(a.label?.nutritionPer100g?.sodiumMg)
    const sb = numberFrom(b.label?.nutritionPer100g?.sodiumMg)
    if (sa != null && sb != null && sa !== sb) {
      const aWins = sa < sb
      return pick(
        aWins ? 'a' : 'b',
        `Less sodium — ${Math.min(sa, sb)} mg against ${Math.max(sa, sb)} mg per 100 g.`
      )
    }
  }

  const ea = numberFrom(a.label?.nutritionPer100g?.energyKcal)
  const eb = numberFrom(b.label?.nutritionPer100g?.energyKcal)
  if (ea != null && eb != null && ea !== eb) {
    const aWins = ea < eb
    return pick(
      aWins ? 'a' : 'b',
      `Lighter — ${Math.min(ea, eb)} kcal against ${Math.max(ea, eb)} per 100 g.`
    )
  }

  return pick('tie', `Nothing on either label separates them for ${person.name}.`)
}
