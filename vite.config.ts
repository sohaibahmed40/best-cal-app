import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    // Process the stylesheet so contrast.test.ts can read its tokens via `?raw`.
    css: { include: [/Calculator\.css/] },
  },
});
