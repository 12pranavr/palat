// Gemini does the reading. This file does the not-forgetting.
//
// A language model will occasionally soften — call maltitol "a sugar substitute"
// and let it slide. These checks run on whatever ingredient list came back and can
// only ever make a verdict STRICTER, never looser. If the model already said NO,
// nothing here touches it.

const SUGAR_ALIASES = [
  'sugar', 'sucrose', 'glucose', 'dextrose', 'fructose', 'maltose', 'lactose',
  'invert sugar', 'invert syrup', 'golden syrup', 'glucose syrup', 'corn syrup',
  'high fructose corn syrup', 'liquid glucose', 'maltodextrin', 'dextrin',
  'molasses', 'treacle', 'honey', 'jaggery', 'gur', 'khandsari', 'muscovado',
  'demerara', 'caramel', 'fruit juice concentrate', 'fruit concentrate',
  'date paste', 'malt extract', 'barley malt', 'rice syrup', 'agave',
]

const SUGAR_ALCOHOLS = [
  'maltitol', 'maltitol syrup', 'sorbitol', 'xylitol', 'erythritol', 'isomalt',
  'lactitol', 'mannitol', 'polyols', 'polyol',
]

const REFINED_CARBS = [
  'maida', 'refined wheat flour', 'refined flour', 'corn starch', 'cornstarch',
  'modified starch', 'rice flour', 'potato starch', 'semolina', 'sooji', 'suji',
]

const BAD_FATS = [
  'palm oil', 'palmolein', 'palm olein', 'hydrogenated vegetable oil',
  'partially hydrogenated', 'hydrogenated fat', 'vanaspati', 'vanaspata',
  'interesterified', 'bakery shortening', 'shortening',
]

const CATEGORIES = [
  {
    key: 'sugar-alcohol',
    label: 'Sugar alcohol',
    terms: SUGAR_ALCOHOLS,
    note: 'Legally "sugar-free". Still raises blood sugar.',
  },
  {
    key: 'hidden-sugar',
    label: 'Sugar, another name',
    terms: SUGAR_ALIASES,
    note: 'This is sugar wearing a different word.',
  },
  {
    key: 'refined-carb',
    label: 'Refined carb',
    terms: REFINED_CARBS,
    note: 'Behaves like sugar once it is inside you.',
  },
  {
    key: 'bad-fat',
    label: 'Fat to watch',
    terms: BAD_FATS,
    note: 'Worth avoiding with BP, cholesterol or heart trouble.',
  },
]

const escapeTerm = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Word boundaries matter: "gur" sits inside "yogurt", "malt" inside "maltitol".
function findTerm(haystack, term) {
  return new RegExp('\\b' + escapeTerm(term) + '\\b', 'i').test(haystack)
}

/**
 * Scan an ingredient list. One finding per ingredient that trips a rule, keeping
 * the longest (most specific) matched term for that ingredient.
 */
export function scanIngredients(ingredients = []) {
  const findings = []

  ingredients.forEach((raw, index) => {
    const text = String(raw || '').toLowerCase()
    if (!text.trim()) return

    let best = null
    for (const category of CATEGORIES) {
      for (const term of category.terms) {
        if (!findTerm(text, term)) continue
        if (!best || term.length > best.term.length) best = { term, category }
      }
    }

    if (best) {
      findings.push({
        ingredient: raw,
        position: index + 1,
        term: best.term,
        category: best.category.key,
        categoryLabel: best.category.label,
        note: best.category.note,
        // Indian labels list by descending weight. Top 3 means there is a lot of it.
        prominent: index < 3,
      })
    }
  })

  return findings
}

const numberFrom = (value) => {
  if (value == null) return null
  const match = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? parseFloat(match[0]) : null
}

// Conditions only. Goals live in their own field on purpose — "lose weight"
// must never substring-match its way into the diabetes or BP checks.
const has = (person, ...words) =>
  (person.conditions || []).some((c) =>
    words.some((w) => c.toLowerCase().includes(w))
  )

const wants = (person, ...words) =>
  (person.goals || []).some((g) => words.some((w) => g.toLowerCase().includes(w)))

/**
 * The claim gap: what the front of the pack says versus what the back contains.
 * This is the line that makes someone flip the next packet themselves.
 */
export function findClaimGap(frontClaims = [], findings = []) {
  const claims = frontClaims.map((c) => String(c).toLowerCase())
  const claimed = (...words) => claims.some((c) => words.some((w) => c.includes(w)))

  const sugary = findings.filter(
    (f) => f.category === 'hidden-sugar' || f.category === 'sugar-alcohol'
  )
  const refined = findings.filter((f) => f.category === 'refined-carb')
  const fats = findings.filter((f) => f.category === 'bad-fat')

  const list = (items) => items.map((f) => f.term).join(', ')

  if (claimed('sugar free', 'sugar-free', 'no sugar', 'no added sugar') && sugary.length) {
    return {
      claim: frontClaims.find((c) => /sugar/i.test(c)),
      truth: 'Contains ' + list(sugary) + '.',
    }
  }
  if (claimed('multigrain', 'whole grain', 'wholegrain', 'atta') && refined.length) {
    return {
      claim: frontClaims.find((c) => /grain|atta/i.test(c)),
      truth: 'The flours listed include ' + list(refined) + '.',
    }
  }
  if (claimed('healthy', 'light', 'diet', 'fit', 'natural') && (fats.length || sugary.length)) {
    return {
      claim: frontClaims.find((c) => /healthy|light|diet|fit|natural/i.test(c)),
      truth: 'Contains ' + list([...sugary, ...fats]) + '.',
    }
  }
  return null
}

const RANK = { YES: 0, SOMETIMES: 1, NO: 2 }

const ordinal = (n) => {
  if (n % 100 >= 11 && n % 100 <= 13) return n + 'th'
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')
}

/**
 * Apply the guardrails to one person's verdict. Can only tighten, never loosen.
 */
export function guardVerdict(verdict, person, findings, nutrition) {
  let floor = 'YES'
  let floorReason = ''

  // Only the rule that actually raised the floor gets to explain itself.
  const tighten = (level, why) => {
    if (RANK[level] > RANK[floor]) {
      floor = level
      floorReason = why
    }
  }

  const diabetic = has(person, 'diabet', 'sugar', 'prediabet')
  const bp = has(person, 'blood pressure', 'bp', 'hypertens')
  const heart = has(person, 'heart', 'cholesterol', 'cardiac', 'lipid')

  if (diabetic) {
    const alcohols = findings.filter((f) => f.category === 'sugar-alcohol')
    const sugars = findings.filter((f) => f.category === 'hidden-sugar')
    const refined = findings.filter((f) => f.category === 'refined-carb')
    const topAlcohol = alcohols.find((f) => f.prominent)
    const topSugar = sugars.find((f) => f.prominent)
    const topRefined = refined.find((f) => f.prominent)

    // Ingredients are printed by descending weight. A sugar alcohol in the top 3
    // means the sweet is built out of it — that is a no, not a "go easy".
    if (topAlcohol)
      tighten('NO', topAlcohol.term + ' is the ' + ordinal(topAlcohol.position) + ' ingredient and still moves blood sugar')
    else if (alcohols.length)
      tighten('SOMETIMES', alcohols[0].term + ' still moves blood sugar')

    if (topSugar) tighten('NO', topSugar.term + ' is in the top 3 ingredients')
    else if (sugars.length) tighten('SOMETIMES', 'contains ' + sugars[0].term)

    // Maida on its own is a "go easy". Maida stacked on top of a sweetener is not.
    if (topRefined && (topAlcohol || topSugar))
      tighten('NO', topRefined.term + ' on top of ' + (topAlcohol || topSugar).term)
    else if (topRefined)
      tighten('SOMETIMES', topRefined.term + ' near the top of the list')
  }

  if (bp) {
    const sodium = numberFrom(nutrition?.sodiumMg)
    if (sodium != null && sodium >= 800)
      tighten('NO', 'sodium ' + sodium + ' mg per 100 g')
    else if (sodium != null && sodium >= 400)
      tighten('SOMETIMES', 'sodium ' + sodium + ' mg per 100 g')
  }

  if (bp || heart) {
    const fats = findings.filter((f) => f.category === 'bad-fat')
    const trans = numberFrom(nutrition?.transFatG)
    if (fats.length) tighten('SOMETIMES', 'contains ' + fats[0].term)
    if (trans != null && trans > 0.2)
      tighten('NO', 'trans fat ' + trans + ' g per 100 g')
  }

  // A goal is not an illness, so this only ever nudges to SOMETIMES, and the
  // reason talks about calories rather than implying a medical problem.
  if (wants(person, 'lose weight', 'weight loss', 'slim', 'reduce weight')) {
    const kcal = numberFrom(nutrition?.energyKcal)
    const fat = numberFrom(nutrition?.totalFatG)
    if (kcal != null && kcal >= 400)
      tighten('SOMETIMES', kcal + ' kcal per 100 g')
    else if (fat != null && fat >= 20)
      tighten('SOMETIMES', fat + ' g fat per 100 g')
  }

  if (wants(person, 'less sugar', 'cut sugar', 'quit sugar', 'reduce sugar')) {
    const sugars = findings.filter(
      (f) => f.category === 'hidden-sugar' || f.category === 'sugar-alcohol'
    )
    if (sugars.some((f) => f.prominent))
      tighten('SOMETIMES', sugars.find((f) => f.prominent).term + ' near the top of the list')
  }

  const original = verdict?.verdict || 'SOMETIMES'
  if (RANK[floor] <= RANK[original]) return { ...verdict, guarded: false }

  return {
    ...verdict,
    verdict: floor,
    guarded: true,
    guardReason: floorReason,
    originalVerdict: original,
  }
}
