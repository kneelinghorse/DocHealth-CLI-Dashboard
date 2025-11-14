import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
