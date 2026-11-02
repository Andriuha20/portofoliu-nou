import { defineConfig } from 'vite'
import { prepareBubbleAssets, bubbleAssetSources } from './scripts/prepare-bubbles.mjs'

// Date holografice pre-calculate (topologii sudate + mediu studio HDR):
// pachete versionate dupa hash in public/holographic/, expuse ca modul
// virtual + preload in index.html. Nu atinge intrarile de build de mai jos.
let bubbleAssets = await prepareBubbleAssets()
const virtualId = '\0virtual:bubble-assets'

export default defineConfig({
  base: './',
  plugins: [{
    name: 'precomputed-bubble-data',
    resolveId(id) { if (id === 'virtual:bubble-assets') return virtualId },
    load(id) { if (id === virtualId) return `export default ${JSON.stringify(bubbleAssets)}` },
    transformIndexHtml(html, context) {
      if (!context.filename?.endsWith('index.html')) return []
      return Object.entries(bubbleAssets.files).map(([name, file]) => ({
        tag: 'link', injectTo: 'head',
        attrs: { rel: 'preload', as: 'fetch', href: `./holographic/${file}`, crossorigin: 'anonymous',
          ...(name === 'desktop' ? { media: '(min-width: 701px)' } : name === 'mobile' ? { media: '(max-width: 700px)' } : {}) },
      }))
    },
    async handleHotUpdate({ file, server }) {
      if (!bubbleAssetSources.includes(file)) return
      bubbleAssets = await prepareBubbleAssets()
      const module = server.moduleGraph.getModuleById(virtualId)
      if (module) server.moduleGraph.invalidateModule(module)
      server.ws.send({ type: 'full-reload' })
    },
  }],
  build: {
    rollupOptions: {
      // Intrări active: portofoliul + laboratoarele 3D izolate.
      // Nu modifică bundle-ul paginii principale (index.html).
      input: {
        principal: 'index.html',
        'blob-lab': 'blob-lab.html',
        'blob-galerie': 'blob-galerie.html',
      },
    },
  },
})
