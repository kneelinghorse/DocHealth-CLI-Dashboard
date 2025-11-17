import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    include: ['tests/**/*.test.{js,jsx}'],
    environmentMatchGlobs: [['tests/server/**/*.test.{js,ts}', 'node']],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
})
