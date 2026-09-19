// Production server. In development Vite serves the pages and the API routes run
// as its middleware; nothing of that exists in a build, so this is what Railway
// actually runs: the built pages plus the same four API routes.
//
// No framework on purpose — the whole server is one file and no extra dependency
// to keep patched.

// Must come first: everything below may read process.env.
import './env.js'

import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { handleAnalyzeRequest } from './analyze.js'
import { handleFamilyRequest } from './parseFamily.js'
import { handleAskRequest } from './ask.js'
import { handleBatchRequest } from './batch.js'
import { apiKeys, modelName } from './gemini.js'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DIST = resolve(HERE, '..', 'dist')
const PORT = Number(process.env.PORT) || 8080

const ROUTES = {
  '/api/analyze': handleAnalyzeRequest,
  '/api/family': handleFamilyRequest,
  '/api/ask': handleAskRequest,
  '/api/batch': handleBatchRequest,
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

async function sendFile(res, path, { cache = false } = {}) {
  const body = await readFile(path)
  res.writeHead(200, {
    'content-type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
    'content-length': body.length,
    // Vite fingerprints everything under /assets, so those are safe to cache
    // hard. index.html must never be cached or a deploy takes hours to show up.
    'cache-control': cache ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = decodeURIComponent(url.pathname)

  // Railway pings this to decide whether the deploy came up.
  if (path === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, keys: apiKeys().length, model: modelName() }))
  }

  const route = ROUTES[path]
  if (route) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ error: 'POST only.' }))
    }
    return route(req, res)
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    return res.end()
  }

  // Static files out of dist, with the path confined to dist so "../" cannot
  // walk out of it.
  const wanted = resolve(DIST, '.' + normalize(path))
  if (wanted.startsWith(DIST)) {
    try {
      const info = await stat(wanted)
      if (info.isFile()) {
        return await sendFile(res, wanted, { cache: path.startsWith('/assets/') })
      }
    } catch {
      /* fall through to the app shell */
    }
  }

  // Every other path is a client-side route (/scan, /family, /cart …), so hand
  // back the app and let the router decide.
  try {
    return await sendFile(res, join(DIST, 'index.html'))
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' })
    res.end('Build missing. Run "npm run build" before starting the server.')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  const keys = apiKeys().length
  console.log(`[palat] listening on ${PORT}`)
  console.log(`[palat] model ${modelName()}, ${keys} API key${keys === 1 ? '' : 's'} loaded`)
  if (!keys) {
    console.warn('[palat] no GEMINI_API_KEY set — scans will fail until one is added')
  }
})
