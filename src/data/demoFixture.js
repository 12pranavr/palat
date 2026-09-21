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
  // Case one: the pack actually tells you, so Palat quotes it.
  openedCheck: {
    printed: true,
    afterOpening: 'Consume within 7 days of opening. Refrigerate after opening.',
    bestBefore: 'Best before 3 months from packaging',
    whyItChanges:
      'There is ghee and palm fat in this, and fat is what turns first once air gets to it. Milk solids in an open box at room temperature are the other reason the pack asks for the fridge.',
    keepIn: 'the fridge, in a closed dabba — not the open mithai box',
  },
  unreadableNote: '',
}

/**
 * The claim-check demo: Sunfeast Farmlite Sugar Free Hazelnut & Oat, read off
 * the real pack.
 *
 * It is the best example of the thing this page exists for, because it does not
 * make one claim — it makes five, and they are all legal. Sugar free (on
 * maltitol). Hazelnut, in the product name, at 4%. Source of protein. No trans
 * fat, which is true. Lactose free, which is also true. Answering only on sugar
 * would leave a family assuming the other four had been checked and passed.
 *
 * Values marked "—" are ones not legible in the photographs this was built from.
 * Inventing them would break the one rule the prompt never bends.
 */
export const DEMO_CLAIM_LABEL = {
  productName: 'Farmlite Sugar Free Hazelnut & Oat Cookies',
  brand: 'Sunfeast · 100 g pack',
  readable: true,
  isEstimate: false,
  frontClaims: [
    'Sugar free',
    'Hazelnut & Oat Cookies',
    'Source of Protein',
    'No Trans Fat',
    'Lactose Free',
  ],
  ingredients: [
    'Refined Wheat Flour (Maida) (37.1%)',
    'Maltitol',
    'Edible Vegetable Oil (Palm)',
    'Oats (12.5%)',
    'Hazelnut (4%)',
    'Raising Agents (INS 503(ii), INS 500(ii))',
    'Emulsifiers (INS 322, INS 471)',
    'Salt',
    'Added Flavours (Natural and Nature Identical)',
  ],
  servingSize: '—',
  servingsPerPack: 'Approx. 8 servings',
  perServeKcal: '—',
  nutritionPer100g: {
    energyKcal: '—',
    carbsG: '—',
    totalSugarG: '—',
    addedSugarG: '0',
    proteinG: '7.2',
    totalFatG: '—',
    satFatG: '—',
    transFatG: '0',
    fibreG: '—',
    sodiumMg: '—',
  },
  // Case two: nothing printed about opening, which is itself the finding.
  openedCheck: {
    printed: false,
    afterOpening: '—',
    bestBefore: 'Best before 9 months from packaging',
    whyItChanges:
      'Palm oil is the third ingredient, and fat is what turns first once air gets to it. Biscuits also pull in moisture and go soft within days in an open sleeve.',
    keepIn: 'an airtight dabba, away from the stove',
  },
  nameCheck: {
    honestName: 'A maida biscuit with 4% hazelnut',
    namedAfter: 'Hazelnut (4%) and oats (12.5%)',
    actuallyMostly: 'Refined wheat flour, maida (37.1%)',
    plainly:
      'Chicken biryani should be mostly chicken. If there is more potato than chicken in it, it is potato biryani. This box is named after hazelnut and oats, but there is about nine times more refined flour in it than hazelnut.',
  },
  claimChecks: [
    {
      claim: 'Sugar free',
      verdict: 'misleading',
      reality:
        'Maltitol is the second ingredient. It is a sugar alcohol, so the pack can legally say sugar free, and it still raises blood glucose.',
    },
    {
      claim: 'Hazelnut & Oat Cookies',
      verdict: 'technically',
      reality:
        'Hazelnut is 4% and oats are 12.5%. Refined wheat flour is 37.1% — the biscuit is named after the smallest thing in it.',
    },
    {
      claim: 'Source of Protein',
      verdict: 'technically',
      reality:
        '7.2 grams per 100 grams, and nobody eats 100 grams. Two cookies carry about a gram, which is less than a spoon of dal.',
    },
    {
      claim: 'No Trans Fat',
      verdict: 'holds',
      reality: 'The label confirms 0 grams of trans fat. This one is true.',
    },
    {
      claim: 'Lactose Free',
      verdict: 'holds',
      reality:
        'No milk solids in the ingredient list. True, and genuinely useful if lactose is your problem.',
    },
  ],
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
    portionUnit: 'cookies today',
    packSays: 'Pack says 8 servings — still too risky for him',
    reason:
      'This is marketed as sugar free but the second ingredient is maltitol. Maltitol is a sugar alcohol that will raise his blood glucose. It also contains thirty seven per cent refined wheat flour, which behaves just like sugar in his body.',
    better: 'Roasted chana, 30 g',
    keyNumbers: ['Maltitol is 2nd ingredient', '37.1% Refined Wheat Flour', 'Hazelnut only 4%'],
  },
  {
    personId: 'mummy',
    verdict: 'SOMETIMES',
    headline: 'Two with tea, Mummy',
    portion: '2',
    portionUnit: 'cookies a week',
    packSays: 'Pack says 8 servings',
    reason:
      'Nothing here works against her blood pressure directly. The catch is that she is paying for a health biscuit and getting maida and palm oil, with four per cent hazelnut on top. Two with tea is a biscuit, not a health food.',
    better: 'Plain khakhra',
    keyNumbers: ['Palm oil is 3rd ingredient', 'Hazelnut only 4%', 'Protein 7.2 g / 100 g'],
  },
  {
    personId: 'chotu',
    verdict: 'SOMETIMES',
    headline: 'Two after school, Chotu',
    portion: '2',
    portionUnit: 'cookies after school',
    packSays: 'Pack says 8 servings',
    reason:
      'Maltitol in any quantity gives children loose motions, so the sugar free version is actually the worse one for him. Two is fine. A handful is a stomach ache, and an ordinary biscuit would treat him better.',
    better: 'Banana',
    keyNumbers: ['Maltitol is 2nd ingredient', 'Oats 12.5%', 'Hazelnut only 4%'],
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
