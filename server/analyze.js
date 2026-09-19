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
        perServeKcal: { type: 'STRING' },
        nutritionPer100g: {
          type: 'OBJECT',
          properties: Object.fromEntries(
            nutritionProps.map((k) => [k, { type: 'STRING' }])
          ),
          required: nutritionProps,
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
        'perServeKcal',
        'nutritionPer100g',
        'unreadableNote',
      ],
}

export const verdictSchema = {
  type: 'OBJECT',
  properties: {
    personId: { type: 'STRING' },
    verdict: { type: 'STRING', enum: ['NO', 'SOMETIMES', 'YES'] },
    headline: { type: 'STRING' },
    reason: { type: 'STRING' },
    portion: { type: 'STRING' },
    better: { type: 'STRING' },
    hindi: { type: 'STRING' },
    keyNumbers: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'personId',
    'verdict',
    'headline',
    'reason',
    'portion',
    'better',
    'hindi',
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

export async function analyze({ imageBase64, mimeType, people, mode }) {
  requireApiKey()
  if (!imageBase64) {
    const err = new Error('No image was sent.')
    err.status = 400
    throw err
  }

  return generateJson({
    systemInstruction: SYSTEM_RULES,
    responseSchema,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
          { text: buildUserPrompt(people, mode) },
        ],
      },
    ],
  })
}

// Shared by the Vite dev middleware and any production server.
export const handleAnalyzeRequest = (req, res) => jsonHandler(req, res, analyze)
