import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import { handleAnalyzeRequest } from './server/analyze.js'
import { handleFamilyRequest } from './server/parseFamily.js'
import { handleAskRequest } from './server/ask.js'
import { handleBatchRequest } from './server/batch.js'

dotenv.config()

// The API key stays in this process. It never reaches the browser bundle.
const ROUTES = {
  '/api/analyze': handleAnalyzeRequest,
  '/api/family': handleFamilyRequest,
  '/api/ask': handleAskRequest,
  '/api/batch': handleBatchRequest,
}

function mount(server) {
  for (const [path, handler] of Object.entries(ROUTES)) {
    server.middlewares.use(path, (req, res, next) => {
      if (req.method !== 'POST') return next()
      handler(req, res)
    })
  }
}

function palatApi() {
  return {
    name: 'palat-api',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}

export default defineConfig({
  plugins: [react(), palatApi()],
  server: { port: 5173 },
})
