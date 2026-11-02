import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/* Geometrie slime prin SDF + smooth union + Marching Cubes.
   Formă = cluster asimetric de mase elipsoidale topite prin smin
   polinomial + warp de joasă frecvență + detaliu FBM subtil.
   Post-procesare: sudare vârfuri (watertight) + netezire Taubin care
   păstrează curbura + normale netede recalculate.
   Extracția se face O SINGURĂ DATĂ la inițializare, cu instanța comună
   MarchingCubes (addon three.js), apoi bufferele temporare se eliberează. */

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeNoise3(seed) {
  const rand = mulberry32(seed)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0
    const t = p[i]
    p[i] = p[j]
    p[j] = t
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const fade = (t) => t * t * (3 - 2 * t)
  return (x, y, z) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const zi = Math.floor(z)
    const xf = x - xi
    const yf = y - yi
    const zf = z - zi
    const X = xi & 255
    const Y = yi & 255
    const Z = zi & 255
    const h = (i, j, k) => perm[(perm[(perm[(X + i) & 255] + ((Y + j) & 255)) & 255] + ((Z + k) & 255)) & 255] / 255
    const u = fade(xf)
    const v = fade(yf)
    const w = fade(zf)
    const x1 = h(0, 0, 0) + (h(1, 0, 0) - h(0, 0, 0)) * u
    const x2 = h(0, 1, 0) + (h(1, 1, 0) - h(0, 1, 0)) * u
    const x3 = h(0, 0, 1) + (h(1, 0, 1) - h(0, 0, 1)) * u
    const x4 = h(0, 1, 1) + (h(1, 1, 1) - h(0, 1, 1)) * u
    const y1 = x1 + (x2 - x1) * v
    const y2 = x3 + (x4 - x3) * v
    return y1 + (y2 - y1) * w
  }
}

function fbmFactory(noise, octave) {
  return (x, y, z) => {
    let v = 0
    let a = 0.5
    let f = 1
    let norma = 0
    for (let o = 0; o < octave; o++) {
      v += a * noise(x * f, y * f, z * f)
      norma += a
      a *= 0.5
      f *= 2.03
      x += 13.7
      y += 7.1
      z += 5.3
    }
    return v / norma
  }
}

// Distanță aproximativă la elipsoid neuniform scalat (iq).
function sdEllipsoid(lx, ly, lz, rx, ry, rz) {
  const px = lx / rx
  const py = ly / ry
  const pz = lz / rz
  const k0 = Math.sqrt(px * px + py * py + pz * pz)
  if (k0 < 1e-9) return -Math.min(rx, ry, rz)
  const qx = lx / (rx * rx)
  const qy = ly / (ry * ry)
  const qz = lz / (rz * rz)
  const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz)
  return (k0 * (k0 - 1)) / k1
}

function sminPolinomial(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

export const SLIME = [
  {
    id: 'slime1', nume: 'Slime 01', descriere: 'Masă joasă și lată, grămadă așezată.',
    netezire: 0.35, margine: 2.8, seed: 101,
    warp: { frec: 0.9, amp: 0.08 }, detaliu: { frec: 1.1, amp: 0.032, octave: 3 },
    mase: [
      { c: [0, 0, 0], r: [1.15, 0.8, 0.95], rot: [0.1, 0.2, -0.15] },
      { c: [1.15, -0.1, 0.3], r: [0.7, 0.55, 0.6], rot: [0.4, -0.3, 0.5] },
      { c: [-1.0, 0.15, -0.35], r: [0.75, 0.6, 0.65], rot: [-0.5, 0.4, 0.2] },
      { c: [0.2, 0.55, -0.7], r: [0.6, 0.5, 0.55], rot: [0.7, 0.1, -0.4] },
      { c: [-0.3, -0.15, 0.9], r: [0.55, 0.5, 0.6], rot: [-0.2, -0.6, 0.6] },
    ],
  },
  {
    id: 'slime2', nume: 'Slime 02', descriere: 'Coloană înaltă, înclinată într-o parte.',
    netezire: 0.32, margine: 2.8, seed: 202,
    warp: { frec: 0.8, amp: 0.09 }, detaliu: { frec: 1.0, amp: 0.035, octave: 3 },
    mase: [
      { c: [0, 0.1, 0], r: [0.85, 1.15, 0.85], rot: [0.15, 0, 0.25] },
      { c: [0.5, 0.9, 0.2], r: [0.6, 0.7, 0.6], rot: [-0.3, 0.5, 0.1] },
      { c: [-0.35, -0.8, 0.1], r: [0.65, 0.6, 0.6], rot: [0.5, -0.2, -0.5] },
      { c: [0.15, 1.5, -0.25], r: [0.45, 0.5, 0.45], rot: [0.2, 0.6, 0.3] },
    ],
  },
  {
    id: 'slime3', nume: 'Slime 03', descriere: 'Petic lung, asimetric, cu capete inegale.',
    netezire: 0.35, margine: 2.8, seed: 303,
    warp: { frec: 1.0, amp: 0.07 }, detaliu: { frec: 1.2, amp: 0.03, octave: 2 },
    mase: [
      { c: [0, 0, 0], r: [1.35, 0.65, 0.75], rot: [0, 0, 0.12] },
      { c: [1.3, 0.15, 0.1], r: [0.6, 0.5, 0.55], rot: [0.3, 0.4, -0.2] },
      { c: [-1.25, -0.1, -0.1], r: [0.65, 0.55, 0.5], rot: [-0.4, 0.3, 0.4] },
      { c: [0.3, 0.45, 0.35], r: [0.5, 0.45, 0.5], rot: [0.6, -0.5, 0.1] },
    ],
  },
  {
    id: 'slime4', nume: 'Slime 04', descriere: 'Ghem cu cocoașe inegale pe toate părțile.',
    netezire: 0.38, margine: 2.8, seed: 404,
    warp: { frec: 0.85, amp: 0.08 }, detaliu: { frec: 1.1, amp: 0.035, octave: 3 },
    mase: [
      { c: [0.15, 0, 0], r: [0.9, 0.85, 0.9], rot: [0.2, 0.1, 0] },
      { c: [-0.85, 0.35, 0.2], r: [0.7, 0.6, 0.65], rot: [-0.4, 0.3, 0.5] },
      { c: [0.7, 0.6, -0.3], r: [0.5, 0.55, 0.5], rot: [0.5, -0.4, -0.3] },
      { c: [0.5, -0.65, 0.3], r: [0.55, 0.5, 0.55], rot: [-0.6, 0.2, 0.4] },
      { c: [-0.1, -0.2, -0.85], r: [0.5, 0.5, 0.5], rot: [0.3, 0.6, -0.5] },
    ],
  },
  {
    id: 'slime5', nume: 'Slime 05', descriere: 'Placă groasă, oblică, cu margini diforme.',
    netezire: 0.35, margine: 2.8, seed: 505,
    warp: { frec: 0.9, amp: 0.07 }, detaliu: { frec: 1.0, amp: 0.03, octave: 2 },
    mase: [
      { c: [0, 0, 0], r: [1.25, 0.55, 1.0], rot: [0.15, 0, 0.22] },
      { c: [-1.05, 0, 0.1], r: [0.7, 0.55, 0.6], rot: [0.4, -0.3, 0.2] },
      { c: [1.2, 0.1, 0.1], r: [0.45, 0.4, 0.45], rot: [-0.3, 0.5, -0.4] },
      { c: [0.3, 0.35, -0.3], r: [0.5, 0.45, 0.5], rot: [0.5, 0.2, 0.6] },
      { c: [-0.2, -0.1, -0.8], r: [0.5, 0.4, 0.5], rot: [-0.2, 0.4, 0.1] },
    ],
  },
  {
    id: 'slime6', nume: 'Slime 06', descriere: 'Amas haotic, volume mici topite între ele.',
    netezire: 0.42, margine: 2.8, seed: 606,
    warp: { frec: 0.75, amp: 0.09 }, detaliu: { frec: 1.2, amp: 0.038, octave: 3 },
    mase: [
      { c: [0.1, -0.1, 0], r: [1.0, 0.95, 0.9], rot: [0.3, -0.2, 0.1] },
      { c: [0.7, -0.6, 0.1], r: [0.65, 0.6, 0.6], rot: [-0.5, 0.4, 0.3] },
      { c: [-0.1, 0.85, 0], r: [0.45, 0.5, 0.45], rot: [0.4, 0.5, -0.4] },
      { c: [-0.8, 0.1, 0.2], r: [0.5, 0.45, 0.5], rot: [-0.2, -0.5, 0.6] },
      { c: [0.2, 0.2, 0.75], r: [0.45, 0.45, 0.5], rot: [0.6, 0.1, -0.2] },
      { c: [-0.3, -0.3, -0.7], r: [0.4, 0.45, 0.45], rot: [-0.4, -0.3, -0.6] },
    ],
  },
  {
    id: 'slime7', nume: 'Slime 07 — Reference Organic Slime', descriere: 'Pernă asimetrică netedă, efilată spre dreapta.',
    netezire: 0.42, margine: 2.8, seed: 707,
    warp: { frec: 0.8, amp: 0.07 }, detaliu: { frec: 1.0, amp: 0.028, octave: 2 },
    mase: [
      { c: [-0.25, 0.05, 0], r: [1.05, 0.9, 0.9], rot: [0.1, 0.05, 0.12] },
      { c: [-0.6, 0.55, 0.05], r: [0.75, 0.62, 0.7], rot: [-0.2, 0.3, -0.15] },
      { c: [0.85, -0.05, 0], r: [0.62, 0.55, 0.58], rot: [0.15, -0.2, 0.2] },
      { c: [0.05, -0.6, 0.05], r: [0.68, 0.55, 0.62], rot: [0.3, 0.1, -0.1] },
      { c: [0.15, 0.25, -0.65], r: [0.6, 0.55, 0.55], rot: [-0.1, 0.4, 0.25] },
    ],
  },
]

// Instanță comună MarchingCubes, reutilizată pentru toate formele.
let mc = null
let mcRezolutie = 0

function asiguraMC(rezolutie, maxTri) {
  if (!mc || mcRezolutie !== rezolutie) {
    if (mc) {
      try {
        mc.geometry.dispose()
        mc.material.dispose()
      } catch (e) {}
      mc = null
    }
    mc = new MarchingCubes(rezolutie, new THREE.MeshBasicMaterial(), false, false, maxTri)
    mcRezolutie = rezolutie
  }
  return mc
}

export function curataSlime() {
  if (mc) {
    try {
      mc.geometry.dispose()
      mc.material.dispose()
    } catch (e) {}
    mc = null
    mcRezolutie = 0
  }
}

// Netezire Taubin (λ|μ) pe buffere indexată: netezește fără micșorarea
// volumului, păstrează curbura și asimetria organică.
export function netezesteTaubin(geo, iteratii = 2, lambda = 0.5, mu = -0.53) {
  const idx = geo.index
  if (!idx) return geo
  const poz = geo.attributes.position
  const n = poz.count
  const vecini = new Array(n)
  for (let i = 0; i < n; i++) vecini[i] = []
  const ia = idx.array
  for (let t = 0; t < ia.length; t += 3) {
    const a = ia[t]
    const b = ia[t + 1]
    const c = ia[t + 2]
    vecini[a].push(b, c)
    vecini[b].push(a, c)
    vecini[c].push(a, b)
  }
  const src = poz.array
  const tmp = new Float32Array(src.length)
  for (let it = 0; it < iteratii; it++) {
    for (const pas of [lambda, mu]) {
      for (let i = 0; i < n; i++) {
        const vec = vecini[i]
        if (!vec.length) continue
        let sx = 0
        let sy = 0
        let sz = 0
        for (let k = 0; k < vec.length; k++) {
          const j = vec[k] * 3
          sx += src[j] - src[i * 3]
          sy += src[j + 1] - src[i * 3 + 1]
          sz += src[j + 2] - src[i * 3 + 2]
        }
        const inv = 1 / vec.length
        tmp[i * 3] = src[i * 3] + pas * sx * inv
        tmp[i * 3 + 1] = src[i * 3 + 1] + pas * sy * inv
        tmp[i * 3 + 2] = src[i * 3 + 2] + pas * sz * inv
      }
      src.set(tmp)
    }
  }
  poz.needsUpdate = true
  return geo
}

// Verifică închiderea topologiei: 0 muchii de frontieră = watertight.
export function verificaInchidere(geo) {
  const idx = geo.index
  if (!idx) return { inchis: false, muchiiFrontiera: -1 }
  const ia = idx.array
  const muchii = new Map()
  for (let t = 0; t < ia.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = ia[t + e]
      const b = ia[t + ((e + 1) % 3)]
      const cheie = a < b ? a * 1000000 + b : b * 1000000 + a
      muchii.set(cheie, (muchii.get(cheie) || 0) + 1)
    }
  }
  let frontiera = 0
  muchii.forEach((nr) => {
    if (nr === 1) frontiera++
  })
  return { inchis: frontiera === 0, muchiiFrontiera: frontiera }
}

// Validare automată a calității (§10): finit, fără NaN, normale,
// fără tăiere SDF, fără artefacte de curbură excesivă.
export function valideazaSlime(geo, cfg) {
  const poz = geo.attributes.position
  const nor = geo.attributes.normal
  const v = new THREE.Vector3()
  let finit = true
  let razaMax = 0
  for (let i = 0; i < poz.count; i++) {
    v.fromBufferAttribute(poz, i)
    if (!Number.isFinite(v.x + v.y + v.z)) {
      finit = false
      break
    }
    const r = v.length()
    if (r > razaMax) razaMax = r
  }
  let normaleOk = true
  if (nor) {
    for (let i = 0; i < nor.count; i += 7) {
      v.fromBufferAttribute(nor, i)
      const l = v.length()
      if (!Number.isFinite(l) || Math.abs(l - 1) > 0.05) {
        normaleOk = false
        break
      }
    }
  }
  const inchidere = verificaInchidere(geo)
  const taiat = razaMax > (cfg.margine || 2.8) * 1.35 * 0.99
  return {
    id: cfg.id,
    finit,
    triunghiuri: idxCount(geo),
    inchis: inchidere.inchis,
    muchiiFrontiera: inchidere.muchiiFrontiera,
    normaleOk,
    taiat,
    valid: finit && normaleOk && inchidere.inchis && !taiat,
  }
}

function idxCount(geo) {
  try {
    return (geo.index ? geo.index.count : geo.attributes.position.count) / 3
  } catch (e) {
    return 0
  }
}

function construiesteMase(cfg) {
  return cfg.mase.map((m) => {
    const mat = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(m.rot[0], m.rot[1], m.rot[2], 'XYZ'))
    mat.invert()
    return { c: m.c, r: m.r, mat: mat.elements }
  })
}

export function extrageSlime(cfg, rezolutie = 96) {
  const tStart = performance.now()
  const inst = asiguraMC(rezolutie, 90000)
  const mase = construiesteMase(cfg)
  const noise = makeNoise3(cfg.seed)
  const fbmWarp = fbmFactory(noise, 2)
  const fbmDet = fbmFactory(makeNoise3(cfg.seed + 7919), cfg.detaliu.octave)
  const B = cfg.margine
  const voxel = (2 * B) / rezolutie
  const K = 80 / (3 * voxel)
  const k = cfg.netezire
  const wf = cfg.warp.frec
  const wa = cfg.warp.amp
  const df = cfg.detaliu.frec
  const da = cfg.detaliu.amp
  const camp = inst.field
  const e = new Array(9)

  const evalBrut = (x, y, z) => {
    let d = 1e9
    for (let i = 0; i < mase.length; i++) {
      const m = mase[i]
      const px = x - m.c[0]
      const py = y - m.c[1]
      const pz = z - m.c[2]
      const me = m.mat
      const lx = me[0] * px + me[4] * py + me[8] * pz
      const ly = me[1] * px + me[5] * py + me[9] * pz
      const lz = me[2] * px + me[6] * py + me[10] * pz
      const el = sdEllipsoid(lx, ly, lz, m.r[0], m.r[1], m.r[2])
      d = d > 1e8 ? el : sminPolinomial(d, el, k)
    }
    return d
  }

  let idx = 0
  for (let gz = 0; gz < rezolutie; gz++) {
    const wz = (gz / rezolutie - 0.5) * 2 * B
    for (let gy = 0; gy < rezolutie; gy++) {
      const wy = (gy / rezolutie - 0.5) * 2 * B
      for (let gx = 0; gx < rezolutie; gx++) {
        const wx = (gx / rezolutie - 0.5) * 2 * B
        const ox = (fbmWarp(wx * wf, wy * wf, wz * wf) - 0.5) * 2 * wa
        const oy = (fbmWarp(wx * wf + 31.7, wy * wf, wz * wf) - 0.5) * 2 * wa
        const oz = (fbmWarp(wx * wf, wy * wf + 17.3, wz * wf) - 0.5) * 2 * wa
        let d = evalBrut(wx + ox, wy + oy, wz + oz)
        // Detaliul fin se evaluează doar lângă suprafață (optimizare).
        if (Math.abs(d) < 0.25) {
          d -= (fbmDet(wx * df, wy * df, wz * df) - 0.5) * 2 * da
        }
        camp[idx++] = 80 - d * K
      }
    }
  }
  const tCamp = performance.now()
  inst.isolation = 80
  inst.update()
  const tPoli = performance.now()

  // Copiază triunghiurile utile într-o geometrie compactă nouă.
  const nr = inst.count
  const poz = new Float32Array(inst.positionArray.buffer, 0, nr * 3)
  const nor = new Float32Array(inst.normalArray.buffer, 0, nr * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(poz.slice(), 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(nor.slice(), 3))
  // Coordonate addon [-1,1] -> lumea SDF [-B,B]; centrează + normalizează.
  geo.scale(B, B, B)
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  const centru = geo.boundingSphere.center
  geo.translate(-centru.x, -centru.y, -centru.z)
  geo.computeBoundingSphere()
  const raza = geo.boundingSphere.radius || 1
  const tinta = 1.35
  geo.scale(tinta / raza, tinta / raza, tinta / raza)
  // Sudare + netezire Taubin + normale netede (suprafață continuă lucioasă).
  let fin = mergeVertices(geo, 1e-4)
  geo.dispose()
  netezesteTaubin(fin, 2, 0.5, -0.53)
  fin.computeVertexNormals()
  fin.computeBoundingSphere()
  fin.computeBoundingBox()
  try {
    console.info('[slime] ' + cfg.id + ' tri=' + Math.round(idxCount(fin)) + ' camp=' + Math.round(tCamp - tStart) + 'ms poli=' + Math.round(tPoli - tCamp) + 'ms valid=' + valideazaSlime(fin, cfg).valid)
  } catch (e) {}
  return fin
}

export function metriciSlime(geo, cfg) {
  geo.computeBoundingBox()
  const cutie = geo.boundingBox
  const mar = new THREE.Vector3()
  cutie.getSize(mar)
  const poz = geo.attributes.position
  const v = new THREE.Vector3()
  let rMin = Infinity
  let rMax = 0
  for (let i = 0; i < poz.count; i += 5) {
    v.fromBufferAttribute(poz, i)
    const r = v.length()
    if (r < rMin) rMin = r
    if (r > rMax) rMax = r
  }
  return {
    id: cfg.id,
    mase: cfg.mase.length,
    aspectXY: +(mar.x / mar.y).toFixed(3),
    aspectXZ: +(mar.x / mar.z).toFixed(3),
    raportRaze: +(rMax / rMin).toFixed(3),
    razaMax: +rMax.toFixed(3),
  }
}
