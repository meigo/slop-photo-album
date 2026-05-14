import { defineConfig } from 'vitest/config';

// Standalone config so vitest does not walk up and pick up the parent
// SvelteKit/Vite config (the sidecar is an independent Node package).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
