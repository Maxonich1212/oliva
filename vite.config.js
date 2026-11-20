import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// Версия сборки (МСК) — видна в настройках и вшивается в sw.js, чтобы телефон подтягивал обновления
const now = new Date(Date.now() + 3 * 3600e3)
const VERSION = now.toISOString().slice(0, 16).replace('T', '.').replace(/-/g, '.').replace(':', '')

const stampSw = {
  name: 'stamp-sw',
  closeBundle() {
    const f = 'dist/sw.js'
    if (existsSync(f)) writeFileSync(f, readFileSync(f, 'utf8').replaceAll('__BUILD__', VERSION))
    // по этому файлу приложение понимает, что вышла новая версия
    writeFileSync('dist/version.json', JSON.stringify({ v: VERSION }))
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), stampSw],
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  server: { port: 5190 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) return 'motion'
        },
      },
    },
  },
})
