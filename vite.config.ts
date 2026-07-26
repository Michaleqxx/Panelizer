import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/Panelizer/',
  test: {
    // The suite covers the pure `lib/` layer, so no DOM is needed; the few
    // browser APIs used there (localStorage) are stubbed per-test.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
