import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@':         fileURLToPath(new URL('./src', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@shared':   fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  root: '.',
  server: {
    port: 5173,
  },
  build: {
    // Never empty the output dir: dist/embed is produced by vite.embed.ts
    // and must survive standalone app builds.
    emptyOutDir: false,
  },
})
