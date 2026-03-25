import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Build config for producing a single deployable HTML file.
 * Usage: npx vite build --config vite.build.config.ts
 * Output: dist/index.html (all JS/CSS inlined, zero external files except CDN)
 */
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
})
