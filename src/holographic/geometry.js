import { IcosahedronGeometry, SphereGeometry, Vector3 } from 'three'
import { createOrganicBlobGeometry, FORME } from '../blob-galerie/geometrie.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { addSurfaceDifferentials } from './surface-differentials.js'
import { topologyConfig } from './topology-config.js'
import { bubbleShapeNames, sculptLiquidShape } from './shape-presets.js'

function flowingSurface(kind, mobile, level, topologies) {
  // A smooth ring surface has no Marching Cubes seams or hard edges. The
  // drifting centreline and changing cross section create actual folds,
  // rather than adding colour patterns to an otherwise round silhouette.
  // Tessellate the actual surface, rather than subdividing already-flat faces.
  const config = topologyConfig[mobile ? 'mobile' : 'desktop']
  const [widthSegments, heightSegments] = config.sphere[level + 1]
  const geometry = topologies?.get(`sphere:${widthSegments}:${heightSegments}`)?.clone() || new SphereGeometry(1, widthSegments, heightSegments)
  return sculptLiquidShape(geometry, kind)
}

function createShape(shape, mobile, level = 0, topologies) {
  const config = topologyConfig[mobile ? 'mobile' : 'desktop']
  const detail = config.ico[level]
  const indexedBase = () => topologies?.get(`ico:${detail}`)?.clone()
  if (shape === 'cloud') {
    const cloud = createOrganicBlobGeometry({
      seed: 27,
      lobii: [
        { d: new Vector3(-0.55, 0.8, 0.15).normalize(), amp: 0.6, clar: 3.8 },
        { d: new Vector3(0.7, -0.5, 0.25).normalize(), amp: 0.55, clar: 3 },
        { d: new Vector3(-0.7, -0.6, -0.3).normalize(), amp: 0.22, clar: 4 },
      ],
      adancituri: [
        { d: new Vector3(0.85, 0.65, 0.2).normalize(), amp: -0.24, clar: 4 },
        { d: new Vector3(-0.8, -0.1, 0.2).normalize(), amp: -0.15, clar: 4 },
      ],
      scala: [1.08, 1, 1.10], detaliuFin: 0.003,
    }, detail, indexedBase())
    const cloudPositions = cloud.attributes.position
    for (let i = 0; i < cloudPositions.count; i++) {
      const x = cloudPositions.getX(i), y = cloudPositions.getY(i), z = cloudPositions.getZ(i)
      const bend = y * 0.23 + Math.sin(z * 1.8 + y) * 0.09
      cloudPositions.setXYZ(i, x * Math.cos(bend) - y * Math.sin(bend), x * Math.sin(bend) + y * Math.cos(bend), z + Math.sin(y * 2.1 + x * 1.6) * 0.065)
    }
    return cloud
  }
  if (shape === 'pebble') return createOrganicBlobGeometry({ ...FORME[0], lobii: FORME[0].lobii.map(l => ({ ...l, amp: l.amp * 0.22 })), adancituri: [], scala: [1, 1.06, 0.95], detaliuFin: 0.003 }, detail, indexedBase())
  if (shape === 'bean' || shape === 'double') {
    return sculptLiquidShape(indexedBase() || new IcosahedronGeometry(1, detail), shape)
  }
  if (shape === 'sphere') {
    const [width, height] = config.sphere[0]
    return topologies?.get(`sphere:${width}:${height}`)?.clone() || new SphereGeometry(1, width, height)
  }
  return flowingSurface(shape, mobile, level, topologies)
}

function finishGeometry(source) {
  // UVs are unused by this world-space material. Remove UV seams before
  // welding, otherwise recalculated normals leave a line in reflections.
  source.deleteAttribute('uv')
  source.deleteAttribute('normal')
  const geometry = source.userData.welded ? source : mergeVertices(source, 1e-5)
  if (geometry !== source) source.dispose()
  geometry.computeVertexNormals()
  geometry.center()
  geometry.computeBoundingBox()
  const size = geometry.boundingBox.getSize(new Vector3())
  const scale = 2 / Math.max(size.x, size.y)
  geometry.scale(scale, scale, scale)
  geometry.computeBoundingSphere()
  return addSurfaceDifferentials(geometry)
}

// Kept for the geometry inspection tools. The scene requests only the shape
// and detail it needs through the cache below, sharing each result page-wide.
export function createBubbleGeometries(mobile) {
  return Object.fromEntries(bubbleShapeNames
    .map(shape => [shape, finishGeometry(createShape(shape, mobile))]))
}

export function createBubbleGeometryCache(mobile, topologies) {
  const cache = new Map()
  return {
    get(shape, radius = 0, nivelMaxim) {
      // CSS radius, not DPR: MSAA cannot smooth a long polygon into a curve.
      // Small bubbles retain their existing budgets. Mobile stops at tier 1.
      // Nivelul grafic LOW poate plafona suplimentar tier-ul (default: neschimbat).
      const large = shape !== 'sphere' && shape !== 'pebble'
      const plafon = nivelMaxim ?? (mobile ? 1 : 2)
      const level = large ? Math.min(plafon, radius > 320 ? 2 : radius > 180 ? 1 : 0) : 0
      const key = `${shape}:${level}`
      if (!cache.has(key)) {
        const start = performance.now()
        cache.set(key, finishGeometry(createShape(shape, mobile, level, topologies)))
        performance.measure(`bubbles:geometry:${key}`, { start, end: performance.now() })
      }
      return cache.get(key)
    },
    dispose() { cache.forEach(geometry => geometry.dispose()); cache.clear() },
  }
}
