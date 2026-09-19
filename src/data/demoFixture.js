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
  unreadableNote: '',
}

export const DEMO_VERDICTS = [
  {
    personId: 'dadaji',
    verdict: 'NO',
    headline: 'Not for Dadaji',
    reason:
      '"Sugar-free" here means maltitol, and it sits on maida and ghee. It still pushes blood sugar up.',
    portion: '—',
    better: 'Roasted chana, 30 g',
    hindi: 'शुगर-फ्री लिखा है, पर अंदर माल्टिटोल, मैदा और घी है — शुगर फिर भी बढ़ेगी।',
    keyNumbers: ['Maltitol · 1st ingredient', 'Maida · 2nd', '240 kcal per piece'],
  },
  {
    personId: 'mummy',
    verdict: 'SOMETIMES',
    headline: 'Once a week, Mummy',
    reason:
      '240 calories a piece and 14 g of fat. Fine once a week — not with tea every evening.',
    portion: 'one piece, once a week',
    better: 'Dry fruit, two pieces',
    hindi: 'एक टुकड़ा 240 कैलोरी। हफ़्ते में एक बार चलेगा, रोज़ नहीं।',
    keyNumbers: ['240 kcal / piece', '14 g fat', 'Sodium 55 mg — fine for BP'],
  },
  {
    personId: 'chotu',
    verdict: 'YES',
    headline: 'Fine for Chotu',
    reason:
      'One piece is fine. It is mostly fat and refined flour, so keep it to one, after a meal.',
    portion: 'one piece, after food',
    better: '—',
    hindi: 'एक टुकड़ा ठीक है, खाने के बाद। एक से ज़्यादा नहीं।',
    keyNumbers: ['240 kcal / piece', 'No allergen for him'],
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
      hindi: 'दादाजी: ढोकला ठीक, काजू कतली दो टुकड़े, गुलाब जामुन नहीं।',
      keyNumbers: ['Estimate — no label'],
    },
    {
      personId: 'mummy',
      verdict: 'SOMETIMES',
      headline: 'All three, small, Mummy',
      reason: 'Nothing here is off limits, but the jamun syrup is where the sugar hides.',
      portion: 'one of each, leave the syrup',
      better: '—',
      hindi: 'मम्मी: ढोकला ठीक, काजू कतली दो, गुलाब जामुन एक।',
      keyNumbers: ['Estimate — no label'],
    },
    {
      personId: 'chotu',
      verdict: 'YES',
      headline: 'Fine for Chotu',
      reason: 'All of it is fine at six. One of each, after food.',
      portion: 'one of each',
      better: '—',
      hindi: 'छोटू: सब ठीक, पर एक-एक ही।',
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
