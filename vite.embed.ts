import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  publicDir: false,
  resolve: {
    alias: {
      '@':         fileURLToPath(new URL('./src', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@shared':   fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/embed/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    outDir: 'dist/embed',
    emptyOutDir: true,
    rollupOptions: {
      external: ['vue', 'vuetify', '@mdi/font'],
      output: {
        globals: { vue: 'Vue', vuetify: 'Vuetify' },
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
})
