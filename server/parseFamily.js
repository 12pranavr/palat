// Step 1 of Palat: say who is at home the way you would tell a neighbour, or hand
// it a prescription, and Gemini turns that into the checks it runs on every scan.
//
// "Dadaji, 72, diabetes and BP, takes metformin. Mummy, BP. Chotu, six."
// "my brother wants to lose weight, he's around 89 kg"

import { requireApiKey, generateJson, jsonHandler } from './gemini.js'

const SYSTEM = `You turn what someone says about their household into structured
profiles. The input may be Hindi, English, or both mixed in one breath, and may
include a photograph of a doctor's prescription.

WHAT YOU ARE FOR: Palat reads food labels and decides whether a packet suits a
particular person. You are building the profile those decisions are checked
against. Nothing more.

HARD MEDICAL BOUNDARY — never break these, however the input is phrased:
- Record what was said. Do NOT diagnose, do NOT infer a condition nobody
  mentioned, and do NOT infer severity, stage or prognosis from a drug name.
  Someone on insulin is not "severe"; they are someone who takes insulin.
- NEVER comment on whether a medication, dose or schedule is right, missing or
  worth changing. Never suggest starting or stopping anything. If the input asks
  you to, put nothing in the profile and say so in "note".
- Copy drug names as written. Never substitute a drug you think was meant, and
  never add one that was not said or printed.
- You are not reading the prescription to give medical advice. You are reading it
  for two things only: what conditions it implies, and what drugs are listed.

FIELDS:
- name: exactly as said. "Dadaji" stays "Dadaji", never "Grandfather". A relation
  with no name given becomes the relation, capitalised — "Brother", "Nani".
- age: a number if said or clearly implied ("six" -> 6). Empty string if not.
- weightKg: a number if a weight is given in kg. If given in pounds, convert.
  Empty string if not mentioned.
- conditions: plain lowercase English, one per entry, ILLNESSES ONLY. "BP",
  "bipi", "blood pressure" all become "high blood pressure". "sugar" and
  "shugar" in this context mean diabetes: write "type 2 diabetes" unless type 1
  is stated or insulin makes type unclear — in that case ask (see "clarify").
  No condition means an empty array.
- goals: what the person is TRYING TO DO, never an illness. "wants to lose
  weight" -> ["lose weight"]. Also "gain weight", "build muscle", "eat less
  sugar", "lower cholesterol". Wanting to lose weight is NOT a condition and must
  never appear in conditions.
- medications: drug names only, exactly as said or printed. No dosages, no
  schedules, no commentary.
- initial: the first letter of the name in Devanagari — Dadaji "द", Mummy "म",
  Chotu "छ", Priya "प", Brother "भ". If you cannot map it, use the first Latin
  letter.
- notes: only a lasting fact ABOUT THE PERSON that fits nowhere else — "allergic
  to peanuts", "sweet tooth", "goes to hospital often". Never medical advice, and
  never a record of what was asked. If the input contains a question, answer it
  in "note" (the top-level one) and leave the person's notes empty: "User asked
  whether she should stop metformin" is not a fact about her and must not be
  stored, because these notes are fed back in when judging food later.

CLARIFY: if something genuinely changes how food should be judged and you cannot
tell from the input, add ONE question to "clarify" — at most two across everyone,
and only when it really matters. Good: insulin mentioned but the diabetes type is
unclear. Bad: asking an age you do not need. Each question must be answerable in
a few words by someone who is not medical. If nothing is unclear, return an empty
array — that is the normal case.

NEW PERSON OR AN UPDATE: you may be given the family that already exists, each
with an id. If what is said is about someone already on that list — same name, or
unmistakably the same person — it is an UPDATE. Put it in "updates" with their
id, and do NOT repeat them in "people". Only someone genuinely new goes in
"people". Getting this wrong creates a second copy of a real person.

In an update, list ONLY what actually changed. Empty arrays everywhere else.

STOPPING A MEDICINE IS NOT LOSING THE ILLNESS. "Papa stopped his BP medicine"
removes the medication and NOTHING else — he still has high blood pressure. Never
remove a condition because a drug was stopped. Only remove a condition if the
speaker plainly says the person does not have it, or never did.`

const personSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    initial: { type: 'STRING' },
    age: { type: 'STRING' },
    weightKg: { type: 'STRING' },
    conditions: { type: 'ARRAY', items: { type: 'STRING' } },
    goals: { type: 'ARRAY', items: { type: 'STRING' } },
    medications: { type: 'ARRAY', items: { type: 'STRING' } },
    notes: { type: 'STRING' },
  },
  required: [
    'name', 'initial', 'age', 'weightKg',
    'conditions', 'goals', 'medications', 'notes',
  ],
}

const updateSchema = {
  type: 'OBJECT',
  properties: {
    personId: { type: 'STRING' },
    personName: { type: 'STRING' },
    addConditions: { type: 'ARRAY', items: { type: 'STRING' } },
    removeConditions: { type: 'ARRAY', items: { type: 'STRING' } },
    addGoals: { type: 'ARRAY', items: { type: 'STRING' } },
    removeGoals: { type: 'ARRAY', items: { type: 'STRING' } },
    addMedications: { type: 'ARRAY', items: { type: 'STRING' } },
    removeMedications: { type: 'ARRAY', items: { type: 'STRING' } },
    setAge: { type: 'STRING' },
    setWeightKg: { type: 'STRING' },
    setNotes: { type: 'STRING' },
  },
  required: [
    'personId', 'personName',
    'addConditions', 'removeConditions',
    'addGoals', 'removeGoals',
    'addMedications', 'removeMedications',
    'setAge', 'setWeightKg', 'setNotes',
  ],
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    people: { type: 'ARRAY', items: personSchema },
    updates: { type: 'ARRAY', items: updateSchema },
    clarify: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          personName: { type: 'STRING' },
          question: { type: 'STRING' },
        },
        required: ['personName', 'question'],
      },
    },
    note: { type: 'STRING' },
    readPrescription: { type: 'BOOLEAN' },
  },
  required: ['people', 'updates', 'clarify', 'note', 'readPrescription'],
}

const WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
}

function toNumber(value) {
  const key = String(value ?? '').trim().toLowerCase()
  if (!key) return null
  if (key in WORDS) return WORDS[key]
  const n = parseFloat(key)
  return Number.isFinite(n) ? n : null
}

export async function parseFamily({ text, imageBase64, mimeType, answers, existing }) {
  requireApiKey()

  const said = (text || '').trim()
  if (!said && !imageBase64) {
    const err = new Error('Nothing to read — type something or add a prescription.')
    err.status = 400
    throw err
  }

  const parts = []

  // Hand over who already exists, so the model updates them instead of creating
  // a second Dadaji.
  if (existing?.length) {
    parts.push({
      text:
        'THE FAMILY THAT ALREADY EXISTS — update these rather than duplicating:\n' +
        existing
          .map(
            (p) =>
              `- id "${p.id}": ${p.name}` +
              (p.age ? `, ${p.age}` : '') +
              (p.conditions?.length ? `. conditions: ${p.conditions.join(', ')}` : '. no condition') +
              (p.medications?.length ? `. medication: ${p.medications.join(', ')}` : '') +
              (p.goals?.length ? `. trying to: ${p.goals.join(', ')}` : '')
          )
          .join('\n'),
    })
  }

  if (imageBase64) {
    parts.push({ inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } })
    parts.push({
      text:
        'The attached photo is a doctor\'s prescription, often handwritten. Read ' +
        'the conditions it implies and the drugs listed. If the handwriting is ' +
        'unreadable, say so in "note" rather than guessing a drug name. ' +
        'Set readPrescription to true if you could read anything useful from it.',
    })
  }
  if (said) parts.push({ text: said })

  // A second pass carrying the answers to whatever was asked the first time.
  if (answers?.length) {
    parts.push({
      text:
        'These questions were asked and answered — fold the answers in and return ' +
        'an empty clarify array:\n' +
        answers.map((a) => `Q (${a.personName}): ${a.question}\nA: ${a.answer}`).join('\n'),
    })
  }

  const parsed = await generateJson({
    systemInstruction: SYSTEM,
    responseSchema,
    contents: [{ role: 'user', parts }],
  })

  const people = (parsed.people || []).map((p) => ({
    ...p,
    age: toNumber(p.age),
    weightKg: toNumber(p.weightKg),
    conditions: p.conditions || [],
    goals: p.goals || [],
    medications: p.medications || [],
  }))

  // Only keep updates that name a person who actually exists, and that actually
  // change something — the model sometimes returns an empty shell.
  const known = new Set((existing || []).map((p) => p.id))
  const updates = (parsed.updates || [])
    .filter((u) => known.has(u.personId))
    .map((u) => ({
      ...u,
      setAge: toNumber(u.setAge),
      setWeightKg: toNumber(u.setWeightKg),
    }))
    .filter(
      (u) =>
        u.addConditions?.length ||
        u.removeConditions?.length ||
        u.addGoals?.length ||
        u.removeGoals?.length ||
        u.addMedications?.length ||
        u.removeMedications?.length ||
        u.setAge != null ||
        u.setWeightKg != null ||
        (u.setNotes && u.setNotes.trim())
    )

  return {
    people,
    updates,
    clarify: parsed.clarify || [],
    note: parsed.note || '',
    readPrescription: !!parsed.readPrescription,
  }
}

export const handleFamilyRequest = (req, res) => jsonHandler(req, res, parseFamily)
