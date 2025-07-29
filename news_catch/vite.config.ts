import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, './shared'),
      '#': resolve(__dirname, './server'),
    },
  },
  build: {
    target: 'node18',
    outDir: 'dist',
    rollupOptions: {
      input: {
        server: resolve(__dirname, 'server/app.ts'),
      },
      output: {
        format: 'es',
        entryFileNames: '[name].mjs',
      },
      external: [
        'better-sqlite3',
        'cheerio',
        'consola',
        'db0',
        'fast-xml-parser',
        'h3',
        'md5',
        'ofetch',
      ],
    },
  },
  test: {
    environment: 'node',
  },
})