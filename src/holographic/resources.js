import { BufferAttribute, BufferGeometry } from 'three'
import assets from 'virtual:bubble-assets'
import { decodePack } from './binary-pack.js'

async function readPack(name) {
  const response = await fetch(`${import.meta.env.BASE_URL}holographic/${assets.files[name]}`)
  if (!response.ok) throw new Error(`Bubble data: ${response.status}`)
  let buffer = await response.arrayBuffer()
  // Vite/static hosts may already send Content-Encoding: gzip, which fetch
  // decodes automatically. Other hosts serve the same file as a gzip asset.
  const signature = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength))
  if (signature[0] === 31 && signature[1] === 139) {
    buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  }
  return decodePack(buffer)
}

export async function prepareBubbleResources() {
  performance.mark('bubbles:data-start')
  try {
    const device = matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop'
    const [models, environment] = await Promise.all([readPack(device), readPack('environment')])
    const topologies = new Map()
    for (const [name, positions] of models) {
      if (!name.endsWith('/position')) continue
      const key = name.slice(0, -9), geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(positions, 3))
      geometry.setIndex(new BufferAttribute(models.get(`${key}/index`), 1))
      geometry.userData.welded = true
      topologies.set(key, geometry)
    }
    performance.mark('bubbles:data-ready')
    return { topologies, environment: environment.get('environment'), dispose() { topologies.forEach(g => g.dispose()) } }
  } catch (error) {
    // This is the same current procedural design, never an older illustration.
    console.warn('Precomputed bubble data unavailable; generating the current design.', error)
    performance.mark('bubbles:procedural-fallback')
    performance.mark('bubbles:data-ready')
    return { dispose() {} }
  }
}
