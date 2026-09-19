// A bounded question box, not a chatbot. It answers food questions about one
// person, grounded in what Palat already knows about them — their profile, the
// packets already scanned, what is in the cart. Nothing else.
//
// This is the widest input surface in the app and it sits next to a profile that
// may say "insulin". The rules below are the reason it is safe to ship.

import { requireApiKey, generateJson, jsonHandler } from './gemini.js'

const SYSTEM = `You are Palat, answering one food question about one person in an
Indian household. You are not a chatbot and not an assistant — you answer the
question asked, in a few sentences, and stop.

WHAT YOU KNOW: the person's profile, the packets this family has already scanned
and what each was judged to be, and what is in their cart. Ground every answer in
that where it is relevant. If the history is empty, say so rather than inventing
a shopping pattern.

HARD MEDICAL BOUNDARY — these override the question, always:
- You read food labels. You do NOT diagnose, do NOT interpret symptoms, do NOT
  read blood sugar or blood pressure numbers, and do NOT comment on whether any
  medication, dose or schedule is right, missing or worth changing.
- If someone reports a reading ("his sugar was 300", "her BP is 160/100"), a
  symptom, or anything happening in someone's body right now, do NOT advise on
  food for it. Set kind to "redirected" and tell them plainly to call their
  doctor. This is not a hedge — a person may be unwell while typing it.
- NEVER count carbohydrates for insulin dosing, and never phrase an amount of
  food as if it were tied to a dose, units or timing of medication. People on
  insulin size doses from carb counts and a wrong number is dangerous.
- NEVER answer "can he skip / delay / halve his medicine", in any wording, even
  to say it is probably fine. Set kind to "redirected".
- NEVER suggest a food as a treatment, cure or replacement for medication.
- If the question is not about food at all, say that is not what Palat is for.

Knowing more about someone makes you more careful, never more clinical.

HOW TO ANSWER a legitimate food question:
- Answer in ENGLISH. Simple spoken English a 72-year-old would follow. The
  question may arrive in Hindi or Hinglish; understand it, answer in English.
  Food names with no English word (gulab jamun, khakhra, chana) stay as they are,
  in plain Latin letters.
- Plain words, the way the well-read younger person in the family would say it
  standing in the kitchen. Short. No lecture, no "it is important to note".
- Name real things: actual foods, actual ingredients, actual numbers from the
  scans you were given.
- For "what can X have", answer from what this family has actually scanned and
  cleared where possible, and say so. Fill gaps with ordinary Indian foods that
  suit the profile — plain, cheap, available in any shop.
- Portions are ordinary food advice ("two pieces", "a small bowl"), never tied
  to medication.
- basedOn: up to 3 short strings naming what you leaned on, e.g. "Dadaji:
  diabetes, BP", "7 packets scanned this week", "cart: roasted chana". Empty if
  you leaned on nothing specific.

Set kind to "answered" for a food answer, "redirected" for anything the boundary
above catches.`

const responseSchema = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING' },
    kind: { type: 'STRING', enum: ['answered', 'redirected'] },
    basedOn: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['answer', 'kind', 'basedOn'],
}

function describePerson(p) {
  const bits = [p.age ? `${p.name}, ${p.age}` : p.name]
  if (p.weightKg) bits.push(`${p.weightKg} kg`)
  bits.push(
    p.conditions?.length ? `conditions: ${p.conditions.join(', ')}` : 'no medical condition'
  )
  if (p.medications?.length) bits.push(`medication: ${p.medications.join(', ')}`)
  if (p.goals?.length) bits.push(`trying to: ${p.goals.join(', ')}`)
  if (p.notes) bits.push(p.notes)
  return bits.join('. ') + '.'
}

export async function ask({ question, person, history = [], cart = [] }) {
  requireApiKey()

  if (!question || !question.trim()) {
    const err = new Error('Ask something first.')
    err.status = 400
    throw err
  }
  if (!person) {
    const err = new Error('Pick who the question is about.')
    err.status = 400
    throw err
  }

  // Compact on purpose: the history can run to hundreds of entries and we only
  // need the recent shape of it, not every field.
  const scans = history
    .filter((h) => h.verdicts?.[person.id])
    .slice(0, 25)
    .map((h) => `${h.productName} — ${h.verdicts[person.id]}`)
    .join('\n')

  const cartLine = cart.length
    ? cart.map((i) => i.name).join(', ')
    : 'nothing in the cart'

  const context = `PERSON
${describePerson(person)}

PACKETS THIS FAMILY HAS SCANNED (most recent first, with what ${person.name} was told)
${scans || 'Nothing scanned yet.'}

CART
${cartLine}

QUESTION ABOUT ${person.name.toUpperCase()}
${question.trim()}`

  return generateJson({
    systemInstruction: SYSTEM,
    responseSchema,
    contents: [{ role: 'user', parts: [{ text: context }] }],
  })
}

export const handleAskRequest = (req, res) => jsonHandler(req, res, ask)
