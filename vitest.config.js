import { defineConfig } from 'vitest/config'

// Standalone test config so the app's Vite/Cloudflare plugins don't load
// during unit tests. Node environment; DOM-less by design.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
