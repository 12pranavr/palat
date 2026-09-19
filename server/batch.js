// Several packets in one go. One call rather than one per photo: cheaper in
// tokens and a single wait instead of five. The risk is the model letting one
// label's numbers bleed into another's, which the prompt forbids and the tests
// check for explicitly.

import { buildBatchPrompt } from './prompt.js'
import { SYSTEM_RULES } from './prompt.js'
import { requireApiKey, generateJson, jsonHandler } from './gemini.js'
import { labelSchema, verdictSchema } from './analyze.js'

export const MAX_IMAGES = 5

const responseSchema = {
  type: 'OBJECT',
  properties: {
    products: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          imageIndex: { type: 'INTEGER' },
          label: labelSchema,
          verdicts: { type: 'ARRAY', items: verdictSchema },
        },
        required: ['imageIndex', 'label', 'verdicts'],
      },
    },
  },
  required: ['products'],
}

export async function analyzeBatch({ images, people }) {
  requireApiKey()

  if (!images?.length) {
    const err = new Error('No photos were sent.')
    err.status = 400
    throw err
  }
  if (images.length > MAX_IMAGES) {
    const err = new Error(`Palat reads up to ${MAX_IMAGES} packets at a time.`)
    err.status = 400
    throw err
  }

  const parts = images.map((img) => ({
    inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.base64 },
  }))
  parts.push({ text: buildBatchPrompt(people, images.length) })

  const out = await generateJson({
    systemInstruction: SYSTEM_RULES,
    responseSchema,
    contents: [{ role: 'user', parts }],
  })

  // Never trust the ordering blindly — put each product back against the photo
  // it claims, and fall back to position if the index is missing or silly.
  const byIndex = new Map()
  ;(out.products || []).forEach((p, i) => {
    const idx =
      Number.isInteger(p.imageIndex) && p.imageIndex >= 0 && p.imageIndex < images.length
        ? p.imageIndex
        : i
    if (!byIndex.has(idx)) byIndex.set(idx, p)
  })

  const products = images.map((_, i) => byIndex.get(i) || null)
  return { products }
}

export const handleBatchRequest = (req, res) => jsonHandler(req, res, analyzeBatch)
