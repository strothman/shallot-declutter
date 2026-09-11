import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { handleApiRequest } from './declutterApi.js'

function declutterApiPlugin(): Plugin {
  return {
    name: 'declutter-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          const handled = await handleApiRequest(req, res)
          if (handled) return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), declutterApiPlugin()],
  server: {
    host: true,
    port: 5173,
  },
})

