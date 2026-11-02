import { IcosahedronGeometry, SphereGeometry } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const threePackage = fileURLToPath(new URL('../package.json', import.meta.resolve('three')))
export const bubbleAssetSources = [...['scripts/prepare-bubbles.mjs', 'src/holographic/topology-config.js', 'src/holographic/binary-pack.js', 'src/holographic/environment.js'].map(p => path.join(root, p)), threePackage]
const directory = path.join(root, 'public/holographic')
const manifestPath = path.join(directory, 'manifest.json')

export async function prepareBubbleAssets() {
  const hash = createHash('sha256')
  for (const source of bubbleAssetSources) hash.update(await fs.readFile(source))
  const version = hash.digest('hex').slice(0, 12)
  let previous
  try {
    const cached = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    previous = cached
    if (cached.version === version) {
      await Promise.all(Object.values(cached.files).map(name => fs.access(path.join(directory, name))))
      return cached
    }
  } catch { /* First build or source changed. */ }
  // A dev edit must evaluate the new generator, not Node's previous module.
  const loadSource = name => import(`${pathToFileURL(path.join(root, name)).href}?baked=${version}`)
  const [{ topologyConfig }, { encodePack }, { createStudioEnvironment }] = await Promise.all([
    loadSource('src/holographic/topology-config.js'), loadSource('src/holographic/binary-pack.js'), loadSource('src/holographic/environment.js'),
  ])
  await fs.mkdir(directory, { recursive: true })
  const files = {}, sizes = {}
  async function save(name, records) {
    const packed = encodePack(records), compressed = gzipSync(packed, { level: 9 })
    const filename = `${name}-${version}.bin.gz`
    await fs.writeFile(path.join(directory, filename), compressed)
    files[name] = filename
    sizes[name] = { raw: packed.byteLength, compressed: compressed.byteLength }
  }
  for (const [device, config] of Object.entries(topologyConfig)) {
    const records = []
    const shapes = [
      ...config.ico.map(detail => [`ico:${detail}`, new IcosahedronGeometry(1, detail)]),
      ...config.sphere.map(([w, h]) => [`sphere:${w}:${h}`, new SphereGeometry(1, w, h)]),
    ]
    for (const [key, source] of shapes) {
      source.deleteAttribute('uv'); source.deleteAttribute('normal')
      const geometry = mergeVertices(source, 1e-5)
      records.push({ name: `${key}/position`, array: geometry.attributes.position.array })
      records.push({ name: `${key}/index`, array: geometry.index.array })
      source.dispose(); geometry.dispose()
    }
    await save(device, records)
  }
  const environment = createStudioEnvironment()
  await save('environment', [{ name: 'environment', array: environment.image.data, predict: { row: environment.image.width * 4, step: 4 } }])
  environment.dispose()
  const manifest = { version, files, sizes }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  for (const old of Object.values(previous?.files || {})) {
    if (Object.values(files).includes(old) || !/^(desktop|mobile|environment)-[a-f0-9]+\.bin\.gz$/.test(old)) continue
    await fs.unlink(path.join(directory, old)).catch(() => {})
  }
  return manifest
}
