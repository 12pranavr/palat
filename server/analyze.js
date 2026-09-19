import { SYSTEM_RULES, buildUserPrompt } from './prompt.js'
import { requireApiKey, generateJson, jsonHandler } from './gemini.js'

// Nutrition values are strings on purpose: a real label is full of "<0.1", "Nil",
// "traces" and smudges. We keep what was printed and parse leniently in the UI.
const nutritionProps = [
  'energyKcal',
  'carbsG',
  'totalSugarG',
  'addedSugarG',
  'proteinG',
  'totalFatG',
  'satFatG',
  'transFatG',
  'fibreG',
  'sodiumMg',
]

// Exported so batch reading can reuse the exact same shapes.
export const labelSchema = {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING' },
        brand: { type: 'STRING' },
        readable: { type: 'BOOLEAN' },
        isEstimate: { type: 'BOOLEAN' },
        frontClaims: { type: 'ARRAY', items: { type: 'STRING' } },
        ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
        servingSize: { type: 'STRING' },
        // The pack's own admission of how much it expects you to eat. Almost
        // every Indian snack prints it ("Number of Servings per Container -
        // Approx. 2") and almost nobody reads it, which makes it the most
        // credible number Palat can put on screen: it isn't Palat's opinion.
        servingsPerPack: { type: 'STRING' },
        perServeKcal: { type: 'STRING' },
        nutritionPer100g: {
          type: 'OBJECT',
          properties: Object.fromEntries(
            nutritionProps.map((k) => [k, { type: 'STRING' }])
          ),
          required: nutritionProps,
        },
        // The biryani test: a product named after an ingredient should be
        // mostly that ingredient. Percentages alone leave the arithmetic to a
        // person in a shop; this is the plain sentence they actually need.
        nameCheck: {
          type: 'OBJECT',
          properties: {
            honestName: { type: 'STRING' },
            namedAfter: { type: 'STRING' },
            actuallyMostly: { type: 'STRING' },
            plainly: { type: 'STRING' },
          },
          required: ['honestName', 'namedAfter', 'actuallyMostly', 'plainly'],
        },
        // EVERY claim on the front, each judged separately. A pack does not make
        // one claim, it makes a wall of them, and answering only on the loudest
        // leaves the buyer assuming the rest were checked and passed.
        claimChecks: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              claim: { type: 'STRING' },
              // Never "false": these claims are almost always legal, which is
              // the actual problem. "technically" is the interesting verdict.
              verdict: {
                type: 'STRING',
                enum: ['holds', 'technically', 'misleading'],
              },
              reality: { type: 'STRING' },
            },
            required: ['claim', 'verdict', 'reality'],
          },
        },
        unreadableNote: { type: 'STRING' },
      },
      required: [
        'productName',
        'brand',
        'readable',
        'isEstimate',
        'frontClaims',
        'ingredients',
        'servingSize',
        'servingsPerPack',
        'perServeKcal',
        'nutritionPer100g',
        'nameCheck',
        'claimChecks',
        'unreadableNote',
      ],
}

export const verdictSchema = {
  type: 'OBJECT',
  properties: {
    personId: { type: 'STRING' },
    verdict: { type: 'STRING', enum: ['NO', 'SOMETIMES', 'YES'] },
    headline: { type: 'STRING' },
    // The number this person came for, and the first thing on the card.
    // Always filled — "None" is an answer, "—" is not.
    portion: { type: 'STRING' },
    // The unit that number counts, so the card can read "2 · biscuits today".
    portionUnit: { type: 'STRING' },
    // The pack's own serving line, restated for this person. "—" if not printed.
    packSays: { type: 'STRING' },
    // What used to be a one-line reason now carries the why as well: this is
    // the summary that sits under the number, and what Listen reads out.
    reason: { type: 'STRING' },
    better: { type: 'STRING' },
    keyNumbers: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'personId',
    'verdict',
    'headline',
    'portion',
    'portionUnit',
    'packSays',
    'reason',
    'better',
    'keyNumbers',
  ],
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    label: labelSchema,
    // Plate mode only: one row per dish on the plate, with a call per person.
    dishes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          note: { type: 'STRING' },
          calls: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                personId: { type: 'STRING' },
                verdict: { type: 'STRING', enum: ['NO', 'SOMETIMES', 'YES'] },
                portion: { type: 'STRING' },
              },
              required: ['personId', 'verdict', 'portion'],
            },
          },
        },
        required: ['name', 'note', 'calls'],
      },
    },
    // Plate mode only: what is visible in the photograph itself, kept entirely
    // separate from the nutrition verdict so neither can be mistaken for the other.
    seen: {
      type: 'OBJECT',
      properties: {
        concerns: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              what: { type: 'STRING' },
              why: { type: 'STRING' },
              severity: { type: 'STRING', enum: ['high', 'watch'] },
            },
            required: ['what', 'why', 'severity'],
          },
        },
        good: { type: 'ARRAY', items: { type: 'STRING' } },
        note: { type: 'STRING' },
      },
      required: ['concerns', 'good', 'note'],
    },
    verdicts: { type: 'ARRAY', items: verdictSchema },
  },
  required: ['label', 'dishes', 'seen', 'verdicts'],
}

export const MAX_PANELS = 4

/**
 * One product, read from one photo or several.
 *
 * Several photos here are PANELS OF THE SAME packet — front, back, nutrition
 * table — not different packets. That distinction is the whole reason this is
 * separate from batch reading: here the images must be merged into one reading,
 * there they must never touch each other. Photographing the front alongside the
 * back is what lets Palat quote a marketing claim and contradict it with the
 * ingredient list, instead of hoping the claim happened to be in frame.
 */
export async function analyze({ imageBase64, mimeType, images, people, mode }) {
  requireApiKey()

  const panels = images?.length
    ? images
    : imageBase64
      ? [{ base64: imageBase64, mimeType, side: 'back' }]
      : []

  if (!panels.length) {
    const err = new Error('No image was sent.')
    err.status = 400
    throw err
  }
  if (panels.length > MAX_PANELS) {
    const err = new Error(`Palat reads up to ${MAX_PANELS} photos of one packet.`)
    err.status = 400
    throw err
  }

  const parts = panels.map((p) => ({
    inlineData: { mimeType: p.mimeType || 'image/jpeg', data: p.base64 },
  }))
  parts.push({ text: buildUserPrompt(people, mode, panels.map((p) => p.side)) })

  return generateJson({
    systemInstruction: SYSTEM_RULES,
    responseSchema,
    contents: [{ role: 'user', parts }],
  })
}

// Shared by the Vite dev middleware and any production server.
export const handleAnalyzeRequest = (req, res) => jsonHandler(req, res, analyze)
