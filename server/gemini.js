// Chosen by measurement, not by reputation — see README. On the real label task
// 3.5-flash with thinking switched off matched every other model's extraction
// (9/9 values, ingredient order intact) while using about a third fewer tokens
// and returning in a third of the time.
//
// Pro models are quota-blocked on a free-tier key, and 3.8 / 3.7 / *-latest were
// all returning "high demand" — so the fallbacks are models actually verified to
// answer, in preference order.
export const DEFAULT_MODEL = 'gemini-3.5-flash'
export const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash']

// Thinking buys nothing here: the task is read-the-label-and-apply-rules, and the
// rules are already in the prompt. Switching it off is most of the saving.
const THINKING_BUDGET = 0

const OVERLOADED = /high demand|overloaded|unavailable|try again later/i
// A quota 429 and a busy 429 look alike but need opposite responses, and this is
// the distinction the whole failover turns on:
//   out of quota  -> the KEY is spent. Another model on the same key fails too.
//                    Rotate the key.
//   overloaded    -> the MODEL is busy. Another key on the same model fails too.
//                    Rotate the model.
const OUT_OF_QUOTA = /quota|billing|rate limit|resource[_ ]exhausted/i
// A third case, and the one that actually broke the first deploy: the key is
// refused outright — mistyped, revoked, or its project denied access. Like a
// quota error this is the KEY's problem, so the answer is the next key. Unlike a
// quota error it will not fix itself, so that key is set aside for good.
const BAD_KEY = /invalid authentication|api key not valid|permission denied|denied access|api_key_invalid|unauthenticated/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PLACEHOLDERS = [
  'paste_your_key_here',
  'your_key_here',
  'your_api_key',
  'changeme',
]

const isReal = (key) => key && !PLACEHOLDERS.includes(key.toLowerCase())

/**
 * Clean a key the way a person actually pastes one. The common mistake when
 * filling in a hosting dashboard is pasting the whole line — name, equals sign
 * and all — into the value box, which produces a key Google rejects with a
 * confusing "invalid authentication credentials". Quotes and stray whitespace
 * are the other two.
 */
function cleanKey(raw) {
  let key = (raw || '').trim().replace(/^["']|["']$/g, '').trim()
  const pasted = key.match(/^GEMINI_API_KEYS?(?:_\d+)?\s*=\s*(.+)$/i)
  if (pasted) key = pasted[1].trim().replace(/^["']|["']$/g, '').trim()
  return key
}

/** Every key configured, in preference order, de-duplicated. */
export function apiKeys() {
  const numbered = Object.keys(process.env)
    .filter((k) => /^GEMINI_API_KEY_\d+$/.test(k))
    .sort((a, b) => Number(a.split('_').pop()) - Number(b.split('_').pop()))
    .map((k) => process.env[k])

  const raw = [
    process.env.GEMINI_API_KEY,
    ...numbered,
    ...(process.env.GEMINI_API_KEYS || '').split(','),
  ]

  return [...new Set(raw.map(cleanKey).filter(isReal))]
}

/**
 * A key that is still the placeholder is worse than no key — Google answers with
 * "API key not valid", which sends you looking in the wrong place.
 */
export function requireApiKey() {
  const keys = apiKeys()
  if (!keys.length) {
    const err = new Error(
      'No Gemini key yet. Open .env in the project root, replace the placeholder ' +
        'with your key from aistudio.google.com/apikey, then restart the dev server.'
    )
    err.status = 500
    throw err
  }
  return keys
}

export const modelName = () => process.env.GEMINI_MODEL || DEFAULT_MODEL

function modelChain() {
  const first = modelName()
  return [first, ...FALLBACK_MODELS.filter((m) => m !== first)]
}

// Which keys are currently spent, by index. Free tier limits are both per-minute
// and per-day and both surface as the same 429, so the cooldown is short: a
// per-minute limit clears by itself, and a per-day one simply fails again and
// rotates on. Lives in memory — a restart is a fresh start, which is correct.
const COOLDOWN_MS = 90_000
const exhausted = new Map()
// Keys Google refused outright. No cooldown — a revoked key does not recover.
const rejected = new Set()

const available = (index) =>
  !rejected.has(index) && (exhausted.get(index) || 0) < Date.now()

const usableCount = (total) => [...Array(total).keys()].filter(available).length

function setAside(index, total, reason) {
  if (reason === 'rejected') rejected.add(index)
  else exhausted.set(index, Date.now() + COOLDOWN_MS)

  const left = usableCount(total)
  const why = reason === 'rejected' ? 'was refused by Google' : 'is out of quota'
  console.warn(
    `[palat] Gemini key ${index + 1}/${total} ${why}; ` +
      (left ? `switching to another key (${left} still usable).` : 'no keys left.')
  )
}

/** Next usable key after `from`, wrapping; null when every key is spent. */
function nextKey(total, from) {
  for (let step = 1; step <= total; step += 1) {
    const i = (from + step) % total
    if (available(i)) return i
  }
  return null
}

async function callOnce({
  apiKey,
  model,
  systemInstruction,
  contents,
  responseSchema,
  temperature,
  allowThinking = false,
}) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          // Temperature 0: the same packet should give the same answer twice.
          temperature,
          responseMimeType: 'application/json',
          responseSchema,
          // Thinking off is the cheap path and is what almost every call uses.
          // A retry after an empty reply lets the model think, since that is the
          // one situation where the saving is clearly not worth it.
          ...(allowThinking ? {} : { thinkingConfig: { thinkingBudget: THINKING_BUDGET } }),
        },
      }),
    }
  )

  const raw = await res.text()
  if (!res.ok) {
    let detail = raw
    try {
      detail = JSON.parse(raw)?.error?.message || raw
    } catch {}
    const err = new Error(detail)
    err.status = res.status
    err.badKey =
      BAD_KEY.test(detail) || res.status === 401 || (res.status === 403 && !OUT_OF_QUOTA.test(detail))
    err.outOfQuota = !err.badKey && OUT_OF_QUOTA.test(detail)
    err.retryable =
      !err.badKey &&
      !err.outOfQuota &&
      (res.status === 429 || res.status === 503 || OVERLOADED.test(detail))
    err.model = model
    throw err
  }

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error('Gemini returned something that was not JSON.')
  }

  const blocked = payload?.promptFeedback?.blockReason
  if (blocked) throw new Error(`Gemini declined this request (${blocked}).`)

  const candidate = payload?.candidates?.[0]
  const text = candidate?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join('')

  // A candidate with no text at all. It happens occasionally and the cause is
  // worth recording rather than swallowing: MAX_TOKENS means the answer was cut
  // off, SAFETY or RECITATION mean it was withheld, STOP with no text is the
  // model simply having produced nothing. Whatever the reason, it is worth one
  // more try, so this is treated as retryable rather than fatal.
  if (!text) {
    const why = candidate?.finishReason || 'no candidate'
    const err = new Error(`Gemini sent nothing back (${why}).`)
    err.status = 502
    err.emptyResponse = true
    err.retryable = true
    err.model = model
    console.warn(
      `[palat] empty response from ${model}, finishReason=${why}` +
        (allowThinking ? ' (thinking was allowed)' : ' (thinking was off)')
    )
    throw err
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Could not parse what Gemini sent back.')
  }
}

/**
 * POST to Gemini, rotating keys when one is spent and models when one is busy.
 * Both failures are invisible to the person holding the phone — they just get
 * their answer, a moment later.
 */
export async function generateJson({ systemInstruction, contents, responseSchema, temperature = 0 }) {
  const keys = requireApiKey()
  const models = modelChain()

  let keyIndex = available(0) ? 0 : (nextKey(keys.length, 0) ?? 0)
  let modelIndex = 0
  let retriedBusy = false
  let allowThinking = false
  let last

  // Enough attempts to walk every key and every model once, plus one retry.
  const maxAttempts = keys.length + models.length + 1

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await callOnce({
        apiKey: keys[keyIndex],
        model: models[modelIndex],
        systemInstruction,
        contents,
        responseSchema,
        temperature,
        allowThinking,
      })
    } catch (err) {
      last = err

      // Both of these are the key's problem, not the model's, so the answer to
      // both is the next key.
      if (err.badKey || err.outOfQuota) {
        setAside(keyIndex, keys.length, err.badKey ? 'rejected' : 'quota')
        const next = nextKey(keys.length, keyIndex)
        if (next == null) break
        keyIndex = next
        continue
      }

      if (err.retryable) {
        // An empty reply is worth one immediate retry with thinking turned back
        // on; overload spikes are usually brief, so those get a short pause.
        if (!retriedBusy) {
          retriedBusy = true
          if (err.emptyResponse) allowThinking = true
          else await sleep(700)
          continue
        }
        modelIndex += 1
        // A fresh model deserves the cheap path again.
        allowThinking = false
        if (modelIndex >= models.length) break
        continue
      }

      break
    }
  }

  let message
  if (last?.badKey) {
    const total = keys.length
    message =
      `Google refused ${rejected.size === total ? 'every key' : 'this key'}: mistyped, revoked, ` +
      'or the key\'s project has been denied access. Check the GEMINI_API_KEY values — when ' +
      'pasting into a hosting dashboard, the value box takes only the key itself, not the ' +
      'whole NAME=value line. Demo mode (add ?demo=1 to the address) works without any key.'
  } else if (last?.outOfQuota) {
    const n = keys.length
    message =
      n > 1
        ? `All ${n} Gemini keys have used up their quota for now. On the free tier that ` +
          'is a daily limit that resets on its own. Demo mode (add ?demo=1 to the ' +
          'address) still works, and a billing-enabled key lifts the cap.'
        : 'This key has used up its Gemini quota for now. On the free tier that is a ' +
          'daily limit that resets on its own. Demo mode (add ?demo=1 to the address) ' +
          'still works, and a billing-enabled key lifts the cap. You can also add a ' +
          'second key as GEMINI_API_KEY_2 in .env and Palat will switch to it.'
  } else if (last?.emptyResponse) {
    message =
      'Gemini kept sending nothing back for this photo, on every model Palat tried. ' +
      'Retake it a little closer and straighter and scan again.'
  } else if (last?.retryable) {
    message =
      'Gemini is busy right now, every model Palat tried was overloaded. Give it a few ' +
      'seconds and scan again.'
  } else {
    message = `Gemini (${last?.model || modelName()}) said: ${last?.message || 'unknown error'}`
  }

  const err = new Error(message)
  err.status = last?.status || 500
  throw err
}

// Five photos of a label run to a few MB of base64, so the cap is generous —
// but unbounded reads on a public URL are how a server gets knocked over.
const MAX_BODY_BYTES = 24 * 1024 * 1024

/** Shared plumbing for the POST handlers. */
export async function jsonHandler(req, res, run) {
  try {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        const err = new Error('Those photos are too large. Try fewer, or retake them.')
        err.status = 413
        throw err
      }
      chunks.push(chunk)
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    const result = await run(body)
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(result))
  } catch (err) {
    res.statusCode = err.status || 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: err.message || 'Something went wrong.' }))
  }
}
