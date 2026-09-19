// Imported for its side effect, before anything that reads process.env.
//
// Loads a local .env when one exists, with no dependency, and never overrides a
// variable the host already set — on Railway the real values come from the
// dashboard and must win over any file that happens to be lying around.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const envPath = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '.env')

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq < 1) continue

    const key = trimmed.slice(0, eq).trim()
    if (process.env[key] !== undefined) continue

    process.env[key] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
}
