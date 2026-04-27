import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-design-files',
      configureServer(server) {
        server.middlewares.use('/design', (req, res, next) => {
          const filePath = path.join(__dirname, 'design', req.url ?? '/')
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', filePath.endsWith('.html') ? 'text/html' : 'application/octet-stream')
            fs.createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        })
      },
    },
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'node',
  },
})
