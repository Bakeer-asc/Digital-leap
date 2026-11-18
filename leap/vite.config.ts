import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom is needed for both test files (localStorage + React rendering)
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
