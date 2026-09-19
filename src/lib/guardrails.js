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
 * Every claim on the front, checked against the back — not just the first one
 * that fails.
 *
 * A pack does not make one claim, it makes a wall of them. Sunfeast Farmlite
 * Sugar Free Hazelnut & Oat carries five at once: sugar free, hazelnut, oat,
 * source of protein, no trans fat, lactose free. Answering only on sugar leaves
 * the buyer thinking the other five were checked and passed.
 *
 * Three verdicts, and the middle one is the important one:
 *   holds        the claim is accurate and means what a buyer thinks it means.
 *   technically  legally true and factually defensible, but it creates an
 *                impression the ingredient list does not support. "Hazelnut &
 *                Oat" on 4% hazelnut lives here.
 *   misleading   the claim points the opposite way to the back of the pack for
 *                the person likely to rely on it.
 *
 * None of these say "false". These claims are almost always legal — that is
 * precisely the problem, and accusing a brand of lying would be both wrong and
 * easy to dismiss. The gap between legal and honest is the whole point.
 *
 * Claims that hold up are reported as holding up. A read that can only find
 * fault is not a read, it is a prejudice.
 */

/** "Hazelnut (4%)" / "Oats 14%" / "Contains 22 % almond" -> 4, 14, 22 */
function declaredPercent(ingredient) {
  const m = String(ingredient).match(/(\d+(?:\.\d+)?)\s*%/)
  return m ? parseFloat(m[1]) : null
}

/**
 * Ingredients a pack is likely to be NAMED after. When a product puts one of
 * these in its name or on its front, Indian labelling requires the percentage
 * to be declared — so the number is right there to be quoted back.
 */
const HERO_INGREDIENTS = [
  'hazelnut', 'almond', 'cashew', 'pistachio', 'walnut', 'peanut', 'badam',
  'oat', 'oats', 'ragi', 'bajra', 'jowar', 'quinoa', 'millet',
  'fruit', 'mango', 'orange', 'apple', 'strawberry', 'blueberry', 'coconut',
  'chocolate', 'cocoa', 'milk', 'butter', 'ghee', 'honey', 'jaggery',
  'paneer', 'cheese', 'tomato', 'spinach', 'carrot',
]

// Below this, the thing on the front of the box is a flavour, not an ingredient.
const TOKEN_THRESHOLD = 10

/**
 * The biryani test.
 *
 * A dish named after an ingredient should be mostly that ingredient. Chicken
 * biryani with more potato than chicken is potato biryani — everyone understands
 * that instantly, and nobody needs a nutrition table to be convinced of it.
 * Packaged food does the same trick with a straight face: "Hazelnut & Oat
 * Cookies" where hazelnut is 4% and refined wheat flour is 37% is a maida
 * biscuit with a nut waved at it.
 *
 * Quoting the two percentages is not enough, because it leaves the arithmetic to
 * a person standing in a shop. This works out the ratio and hands back the
 * pieces for a plain sentence: what it is called, what it actually is, and how
 * many times more of the filler there is than the thing on the front.
 *
 * Returns null when the name is honest — when the hero ingredient leads, or when
 * the percentages needed to prove otherwise are not printed. A pack that is what
 * it says it is must come back clean, or the finding means nothing anywhere.
 */

/** "Refined Wheat Flour (Maida) (37.1%)" -> "Refined Wheat Flour (Maida)" */
function cleanIngredient(line) {
  return String(line)
    .replace(/\s*\(?\s*\d+(\.\d+)?\s*%\s*\)?/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,\s]+$/, '')
    .trim()
}

export function findNameGap(label = {}) {
  const name = String(label.productName || '').toLowerCase()
  const ingredients = (label.ingredients || []).map(String).filter(Boolean)
  if (!name || ingredients.length < 2) return null

  // The hero: an ingredient the product is named after. When a name promises
  // several ("Hazelnut & Oat"), the smallest one is the honest headline.
  let hero = null
  for (const term of HERO_INGREDIENTS) {
    if (!findTerm(name, term)) continue
    const line = ingredients.find((i) => findTerm(i, term))
    if (!line) continue
    const pct = declaredPercent(line)
    if (pct == null) continue
    if (!hero || pct < hero.pct) hero = { term, pct }
  }
  if (!hero) return null

  // Indian labels run in descending order of weight, so the first line is what
  // the product mostly is — whatever the front of the box would rather discuss.
  const dominantLine = ingredients[0]
  const dominant = cleanIngredient(dominantLine)
  const dominantPct = declaredPercent(dominantLine)
  if (findTerm(dominantLine, hero.term)) return null // the name is honest

  // Without the leading ingredient's percentage the ratio would be invented, and
  // position alone is still worth saying.
  const times =
    dominantPct != null && hero.pct > 0 ? Math.round(dominantPct / hero.pct) : null

  return {
    hero: capitalise(hero.term),
    heroPercent: hero.pct,
    dominant,
    dominantPercent: dominantPct,
    times: times && times >= 2 ? times : null,
  }
}

export function findClaimGaps(frontClaims = [], findings = [], label = {}) {
  const out = []
  const seen = new Set()

  const add = (claim, verdict, reality) => {
    if (!claim || !reality) return
    const key = String(claim).toLowerCase().trim()
    if (seen.has(key)) return
    seen.add(key)
    out.push({ claim, verdict, reality, fromRules: true })
  }

  const list = (items) => items.map((f) => f.term).join(', ')
  const sugary = findings.filter(
    (f) => f.category === 'hidden-sugar' || f.category === 'sugar-alcohol'
  )
  const refined = findings.filter((f) => f.category === 'refined-carb')
  const fats = findings.filter((f) => f.category === 'bad-fat')

  const ingredients = (label.ingredients || []).map((i) => String(i))
  const nutrition = label.nutritionPer100g || {}

  for (const raw of frontClaims) {
    const claim = String(raw || '').trim()
    if (!claim) continue
    const c = claim.toLowerCase()
    const says = (...words) => words.some((w) => c.includes(w))

    // "Sugar free" sitting on maltitol, or "no added sugar" on fruit concentrate.
    if (says('sugar free', 'sugar-free', 'no sugar', 'no added sugar', 'zero sugar')) {
      if (sugary.length) {
        add(claim, 'misleading', 'Contains ' + list(sugary) + '.')
        continue
      }
      add(claim, 'holds', 'No sugar or sugar alcohol found in the ingredient list.')
      continue
    }

    // Grain claims on a refined-flour base.
    if (says('multigrain', 'whole grain', 'wholegrain', 'whole wheat', 'atta', 'high fibre', 'high fiber')) {
      if (refined.length) {
        add(claim, 'misleading', 'The flours listed include ' + list(refined) + '.')
        continue
      }
    }

    // No trans fat — one of the few claims a label can settle outright.
    if (says('trans fat', 'trans-fat')) {
      const trans = numberFrom(nutrition.transFatG)
      if (trans === 0) {
        add(claim, 'holds', 'The label confirms 0 g trans fat per 100 g.')
        continue
      }
      if (trans > 0) {
        add(claim, 'misleading', `The label lists ${nutrition.transFatG} g trans fat per 100 g.`)
        continue
      }
    }

    // "Source of protein" on a number that does not earn it.
    if (says('protein')) {
      const protein = numberFrom(nutrition.proteinG)
      if (protein != null && protein < 6) {
        add(
          claim,
          'technically',
          `${nutrition.proteinG} g protein per 100 g — less than a roti, and you would eat far less than 100 g.`
        )
        continue
      }
    }

    // The one this was rebuilt for: a pack named after an ingredient it barely
    // contains. The percentage is on the label by law, so quote it.
    for (const hero of HERO_INGREDIENTS) {
      if (!says(hero)) continue
      const line = ingredients.find((i) => findTerm(i, hero))
      if (!line) {
        add(claim, 'technically', `No ${hero} appears in the ingredient list at all.`)
        break
      }
      const pct = declaredPercent(line)
      if (pct != null && pct < TOKEN_THRESHOLD) {
        const base = refined.length ? ` ${capitalise(refined[0].term)} is the bulk of it.` : ''
        add(claim, 'technically', `${capitalise(hero)} is only ${pct}% of this.${base}`)
      }
      break
    }

    // "Healthy", "light", "diet", "natural" over sugar or bad fat.
    if (says('healthy', 'light', 'diet', 'fit', 'natural', 'guilt free', 'guilt-free')) {
      if (fats.length || sugary.length) {
        add(claim, 'misleading', 'Contains ' + list([...sugary, ...fats]) + '.')
      }
    }
  }

  return out
}

function capitalise(w) {
  return w.charAt(0).toUpperCase() + w.slice(1)
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
