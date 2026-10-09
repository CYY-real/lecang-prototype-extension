import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const extensionRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: extensionRoot,
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        popup: fileURLToPath(new URL('./popup.html', import.meta.url)),
        content: fileURLToPath(new URL('./src/content.ts', import.meta.url)),
      },
      output: {
        entryFileNames: (chunk) => chunk.name === 'content' ? 'content.js' : 'assets/[name]-[hash].js',
      },
    },
  },
})
