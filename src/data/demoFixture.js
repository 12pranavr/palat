// A real reading, captured from a real packet, frozen.
//
// Two jobs: it lets the pages be worked on without burning API calls, and it is
// the fallback when the venue wifi dies thirty seconds before you present.
// Reached at /?demo=1. Verdicts here still run through the guardrails like any
// other reading — nothing is pre-baked past the label itself.

export const DEMO_LABEL = {
  productName: 'Sugar Free Kaju Katli',
  brand: 'Festive Sweets · 250 g · 8 pieces',
  readable: true,
  isEstimate: false,
  frontClaims: ['SUGAR FREE', 'Diabetic Friendly'],
  ingredients: [
    'Maltitol (sweetener 965)',
    'Refined Wheat Flour (Maida)',
    'Cashew (24%)',
    'Edible Vegetable Fat (Palm)',
    'Milk Solids',
    'Clarified Butter (Ghee)',
    'Permitted Emulsifier (INS 471)',
    'Artificial Flavour',
  ],
  servingSize: '1 piece (32 g)',
  servingsPerPack: 'Approx. 8 servings · 32 g each',
  perServeKcal: '240',
  nutritionPer100g: {
    energyKcal: '512',
    carbsG: '56.8',
    totalSugarG: '0.4',
    addedSugarG: '0',
    proteinG: '8.4',
    totalFatG: '28.6',
    satFatG: '14.2',
    transFatG: '0.1',
    fibreG: '1.8',
    sodiumMg: '55',
  },
  claimCheck: {
    claim: 'SUGAR FREE',
    reality: 'Maltitol is the first ingredient and maida the second.',
  },
  unreadableNote: '',
}

/**
 * The claim-check demo, taken from a real Unibic oats-and-coconut cookie pack.
 *
 * It is the clearest example of the gap Palat exists to show: the front is a
 * photograph of rolled oats with the words "Creative Visualization" printed
 * beside it, while the back lists refined wheat flour first, palm oil second, and
 * 33.6 g of total sugar per 100 g. Nothing here is illegal. Every word on the
 * front is defensible. It is still not what the buyer thinks they are holding.
 */
export const DEMO_CLAIM_LABEL = {
  productName: 'Oats & Coconut Cookies',
  brand: 'Unibic Foods India · 60 g pack',
  readable: true,
  isEstimate: false,
  frontClaims: ['OATS', 'Creative Visualization'],
  ingredients: [
    'Refined Wheat Flour (Maida)',
    'Sugar',
    'Edible Vegetable Oil (Palm)',
    'Rolled Oats (14%)',
    'Coconut',
    'Invert Syrup',
    'Honey (1%)',
    'Leavening Agents (INS 500(ii), INS 503(ii))',
    'Salt',
  ],
  servingSize: '30 g',
  servingsPerPack: 'Approx. 2 servings · 30 g each',
  perServeKcal: '143',
  nutritionPer100g: {
    energyKcal: '476',
    carbsG: '70',
    totalSugarG: '33.6',
    addedSugarG: '31.6',
    proteinG: '6.2',
    totalFatG: '19',
    satFatG: '10.6',
    transFatG: '0',
    fibreG: '—',
    sodiumMg: '285',
  },
  claimCheck: {
    claim: 'Oats on the front, with rolled oats pictured',
    reality:
      'Refined wheat flour is the first ingredient and palm oil the third. Oats are 14 per cent, and honey is 1 per cent.',
  },
  unreadableNote: '',
}

export const DEMO_VERDICTS = [
  {
    personId: 'dadaji',
    verdict: 'NO',
    headline: 'Not for Dadaji',
    portion: '0',
    portionUnit: 'pieces today',
    packSays: 'Pack says 8 servings of 32 grams each',
    reason:
      'Sugar free here means maltitol, and it is sitting on maida and ghee. Maltitol still raises blood sugar, and the refined flour under it behaves like sugar too. For diabetes this is a sweet wearing a diabetic label.',
    better: 'Roasted chana, 30 g',
    keyNumbers: ['Maltitol · 1st ingredient', 'Maida · 2nd', '240 kcal per piece'],
  },
  {
    personId: 'mummy',
    verdict: 'SOMETIMES',
    headline: 'Once a week, Mummy',
    portion: '1',
    portionUnit: 'piece a week',
    packSays: 'Pack says 8 servings of 32 grams each',
    reason:
      'Each piece is 240 calories and 14 grams of fat. The sodium is low so her blood pressure is not the problem here, the calories are. One with Sunday tea is fine, one every evening is a different food.',
    better: 'Dry fruit, two pieces',
    keyNumbers: ['240 kcal / piece', '14 g fat', 'Sodium 55 mg — fine for BP'],
  },
  {
    personId: 'chotu',
    verdict: 'YES',
    headline: 'Fine for Chotu',
    portion: '1',
    portionUnit: 'piece after food',
    packSays: 'Pack says 8 servings of 32 grams each',
    reason:
      'One piece is genuinely fine for him. It is mostly fat and refined flour rather than anything harmful, so the only rule is that it comes after a meal and not instead of one.',
    better: '—',
    keyNumbers: ['240 kcal / piece', 'No allergen for him'],
  },
]

/**
 * Verdicts for the claim-check demo, matching DEMO_CLAIM_LABEL.
 *
 * Kept separate from DEMO_VERDICTS on purpose: reusing the kaju katli verdicts
 * here put "8 servings" on screen underneath a two-serving cookie pack, which is
 * exactly the kind of mismatch this app exists to catch.
 */
export const DEMO_CLAIM_VERDICTS = [
  {
    personId: 'dadaji',
    verdict: 'NO',
    headline: 'Not for Dadaji',
    portion: '0',
    portionUnit: 'biscuits today',
    packSays: 'Pack says 2 servings of 30 grams each',
    reason:
      'The oats on the front are 14 per cent. Refined wheat flour is the first ingredient and palm oil the third, and there are 33.6 grams of total sugar in every 100 grams. For his diabetes that is a sugar biscuit with an oat photograph on it.',
    better: 'Roasted chana, 30 g',
    keyNumbers: ['Maida · 1st ingredient', 'Total sugars 33.6 g / 100 g', 'Palm oil · 3rd'],
  },
  {
    personId: 'mummy',
    verdict: 'SOMETIMES',
    headline: 'Two with tea, Mummy',
    portion: '2',
    portionUnit: 'biscuits a week',
    packSays: 'Pack says 2 servings of 30 grams each — that is the whole pack',
    reason:
      'Sodium is 285 milligrams per 100 grams, which is moderate rather than a problem for her blood pressure. The catch is the sugar and the palm oil, and that the whole pack is only two servings, so finishing it is far easier than it looks.',
    better: 'Plain khakhra',
    keyNumbers: ['Sodium 285 mg / 100 g', '476 kcal / 100 g', 'Saturated fat 10.6 g / 100 g'],
  },
  {
    personId: 'chotu',
    verdict: 'SOMETIMES',
    headline: 'Two after school, Chotu',
    portion: '2',
    portionUnit: 'biscuits after school',
    packSays: 'Pack says 2 servings of 30 grams each',
    reason:
      'Nothing here is harmful for a six-year-old, it is simply a sweet biscuit rather than the oat snack the front suggests. Two after school is a treat. The whole pack is most of a meal in sugar.',
    better: 'Banana',
    keyNumbers: ['Added sugars 31.6 g / 100 g', 'Oats only 14%', 'Honey 1%'],
  },
]

export const DEMO_PLATE = {
  label: {
    productName: 'Wedding buffet plate',
    brand: '',
    readable: true,
    isEstimate: true,
    frontClaims: [],
    ingredients: ['Dhokla', 'Kaju katli', 'Gulab jamun'],
    servingSize: 'one plate',
    perServeKcal: '—',
    nutritionPer100g: {
      energyKcal: '—', carbsG: '—', totalSugarG: '—', addedSugarG: '—',
      proteinG: '—', totalFatG: '—', satFatG: '—', transFatG: '—',
      fibreG: '—', sodiumMg: '—',
    },
    unreadableNote: 'No label here — these are estimates from what is on the plate.',
  },
  seen: {
    concerns: [],
    good: ['Steel plate', 'Food served covered'],
    note: 'Nothing on the plate itself stands out either way.',
  },
  dishes: [
    {
      name: 'Dhokla',
      note: 'Steamed, fermented gram. The lightest thing on this plate.',
      calls: [
        { personId: 'dadaji', verdict: 'YES', portion: 'two pieces' },
        { personId: 'mummy', verdict: 'YES', portion: 'go easy on the chutney' },
        { personId: 'chotu', verdict: 'YES', portion: 'as much as he wants' },
      ],
    },
    {
      name: 'Kaju katli',
      note: 'Cashew and sugar syrup. Rich, but not fried.',
      calls: [
        { personId: 'dadaji', verdict: 'SOMETIMES', portion: 'two pieces, not more' },
        { personId: 'mummy', verdict: 'SOMETIMES', portion: 'two pieces' },
        { personId: 'chotu', verdict: 'YES', portion: 'one, after food' },
      ],
    },
    {
      name: 'Gulab jamun',
      note: 'Fried maida sitting in sugar syrup. The heaviest thing here.',
      calls: [
        { personId: 'dadaji', verdict: 'NO', portion: 'skip it' },
        { personId: 'mummy', verdict: 'SOMETIMES', portion: 'one, and leave the syrup' },
        { personId: 'chotu', verdict: 'SOMETIMES', portion: 'one is plenty at six' },
      ],
    },
  ],
  verdicts: [
    {
      personId: 'dadaji',
      verdict: 'SOMETIMES',
      headline: 'Two of three, Dadaji',
      reason: 'Dhokla is fine and the katli is two pieces — but leave the gulab jamun.',
      portion: 'dhokla, two katli, no jamun',
      better: '—',
      keyNumbers: ['Estimate — no label'],
    },
    {
      personId: 'mummy',
      verdict: 'SOMETIMES',
      headline: 'All three, small, Mummy',
      reason: 'Nothing here is off limits, but the jamun syrup is where the sugar hides.',
      portion: 'one of each, leave the syrup',
      better: '—',
      keyNumbers: ['Estimate — no label'],
    },
    {
      personId: 'chotu',
      verdict: 'YES',
      headline: 'Fine for Chotu',
      reason: 'All of it is fine at six. One of each, after food.',
      portion: 'one of each',
      better: '—',
      keyNumbers: ['Estimate — no label'],
    },
  ],
}

export const DEMO_FAMILY = [
  {
    name: 'Dadaji', initial: 'द', age: 72, weightKg: null,
    conditions: ['type 2 diabetes', 'high blood pressure'],
    goals: [], medications: ['metformin'], notes: 'Sweet tooth.',
  },
  {
    name: 'Mummy', initial: 'म', age: 48, weightKg: null,
    conditions: ['high blood pressure'], goals: ['lose weight'],
    medications: [], notes: '',
  },
  {
    name: 'Chotu', initial: 'छ', age: 6, weightKg: null,
    conditions: [], goals: [], medications: [], notes: '',
  },
]
