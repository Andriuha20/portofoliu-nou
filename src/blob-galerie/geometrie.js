import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/* Fabrica de geometrie organică configurabilă.
   Fiecare familie are lobi expliciți (direcții/amplitudini/clarități
   deliberate diferite), adâncituri proprii și scalări proprii — NU doar
   semințe diferite. Seed-ul influențează doar micro-detaliul fin. */

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

function dir(azDeg, elDeg) {
  const az = (azDeg * Math.PI) / 180
  const el = (elDeg * Math.PI) / 180
  return new THREE.Vector3(
    Math.cos(el) * Math.cos(az),
    Math.sin(el),
    Math.cos(el) * Math.sin(az),
  ).normalize()
}

export const FORME = [
  {
    id: 'triunghiular', nume: '01 — Triunghiular organic',
    descriere: 'Trei lobi mari rotunjiți, tranziții concave moi.',
    lobii: [
      { d: dir(90, 12), amp: 0.5, clar: 2.5 },
      { d: dir(210, 5), amp: 0.48, clar: 2.7 },
      { d: dir(330, 8), amp: 0.52, clar: 2.4 },
    ],
    adancituri: [
      { d: dir(30, 10), amp: -0.3, clar: 2.6 },
      { d: dir(150, 6), amp: -0.3, clar: 2.6 },
      { d: dir(270, 4), amp: -0.3, clar: 2.6 },
    ],
    scala: [1.05, 1.0, 0.85], seed: 11, detaliuFin: 0.028,
  },
  {
    id: 'pata', nume: '02 — Pată organică',
    descriere: 'Cinci lobi inegali, proeminențe asimetrice, volum lat.',
    lobii: [
      { d: dir(20, 25), amp: 0.42, clar: 2.2 },
      { d: dir(140, -10), amp: 0.5, clar: 2.0 },
      { d: dir(250, 30), amp: 0.34, clar: 2.4 },
      { d: dir(300, -35), amp: 0.46, clar: 2.1 },
      { d: dir(60, -50), amp: 0.3, clar: 2.3 },
    ],
    adancituri: [
      { d: dir(80, -5), amp: -0.22, clar: 2.4 },
      { d: dir(195, 15), amp: -0.26, clar: 2.5 },
    ],
    scala: [1.25, 0.85, 0.9], seed: 27, detaliuFin: 0.032,
  },
  {
    id: 'picatura', nume: '03 — Picătură alungită',
    descriere: 'Formă verticală: capăt dominant rotund + două protuberanțe mici.',
    lobii: [
      { d: dir(90, 55), amp: 0.5, clar: 2.2 },
      { d: dir(200, -5), amp: 0.25, clar: 2.6 },
      { d: dir(340, -5), amp: 0.27, clar: 2.6 },
    ],
    adancituri: [
      { d: dir(270, -55), amp: -0.15, clar: 1.8 },
    ],
    scala: [0.85, 1.35, 0.85], seed: 47, detaliuFin: 0.024,
  },
  {
    id: 'stea', nume: '04 — Stea rotunjită',
    descriere: 'Cinci vârfuri netede de lungimi diferite, adâncituri adânci.',
    lobii: [
      { d: dir(90, 8), amp: 0.62, clar: 5.0 },
      { d: dir(162, 5), amp: 0.45, clar: 5.0 },
      { d: dir(234, 6), amp: 0.6, clar: 5.0 },
      { d: dir(306, 5), amp: 0.42, clar: 5.0 },
      { d: dir(18, 7), amp: 0.52, clar: 5.0 },
    ],
    adancituri: [
      { d: dir(126, 6), amp: -0.5, clar: 6.0 },
      { d: dir(198, 5), amp: -0.5, clar: 6.0 },
      { d: dir(270, 5), amp: -0.5, clar: 6.0 },
      { d: dir(342, 6), amp: -0.5, clar: 6.0 },
      { d: dir(54, 7), amp: -0.5, clar: 6.0 },
    ],
    scala: [1.1, 1.1, 0.8], seed: 63, detaliuFin: 0.02,
  },
  {
    id: 'balta', nume: '05 — Băltoacă aplatizată',
    descriere: 'Lat, turtit asimetric, margini rotunjite inegale, grosime organică.',
    lobii: [
      { d: dir(10, 5), amp: 0.32, clar: 2.0 },
      { d: dir(150, 8), amp: 0.28, clar: 2.1 },
      { d: dir(250, -5), amp: 0.35, clar: 1.9 },
      { d: dir(330, -8), amp: 0.25, clar: 2.2 },
    ],
    adancituri: [
      { d: dir(90, 10), amp: -0.14, clar: 2.2 },
      { d: dir(210, 0), amp: -0.16, clar: 2.2 },
    ],
    scala: [1.5, 0.62, 0.9], seed: 78, detaliuFin: 0.03,
  },
  {
    id: 'amoeba', nume: '06 — Amoebă complexă',
    descriere: 'Șase lobi neregulați, indentări adânci, puternic asimetric.',
    lobii: [
      { d: dir(15, 30), amp: 0.44, clar: 2.1 },
      { d: dir(100, -20), amp: 0.5, clar: 2.0 },
      { d: dir(185, 25), amp: 0.36, clar: 2.3 },
      { d: dir(260, -30), amp: 0.47, clar: 2.1 },
      { d: dir(320, 45), amp: 0.32, clar: 2.4 },
      { d: dir(45, -60), amp: 0.38, clar: 2.2 },
    ],
    adancituri: [
      { d: dir(60, 5), amp: -0.3, clar: 2.4 },
      { d: dir(145, -5), amp: -0.32, clar: 2.4 },
      { d: dir(295, 10), amp: -0.3, clar: 2.4 },
    ],
    scala: [1.15, 1.0, 0.95], seed: 94, detaliuFin: 0.036,
  },
]

export function createOrganicBlobGeometry(cfg, detaliu = 40) {
  const aleator = mulberry32(cfg.seed || 1)
  const faza1 = aleator() * 6.28
  const faza2 = aleator() * 6.28
  const faza3 = aleator() * 6.28
  // Icosaedrul e neindexat: sudăm vârfurile ÎNAINTE de deformare,
  // altfel normalele recalculate rămân fațetate.
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, detaliu))
  const poz = geo.attributes.position
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < poz.count; i++) {
    v.fromBufferAttribute(poz, i)
    n.copy(v).normalize()
    let d = 0
    for (const lob of cfg.lobii) {
      const k = Math.max(0, n.dot(lob.d))
      d += lob.amp * Math.pow(k, lob.clar)
    }
    for (const ad of cfg.adancituri) {
      const k = Math.max(0, n.dot(ad.d))
      d += ad.amp * Math.pow(k, ad.clar)
    }
    d += cfg.detaliuFin * Math.sin(n.x * 5.1 + faza1) * Math.sin(n.y * 4.3 + faza2) * Math.sin(n.z * 4.7 + faza3)
    v.multiplyScalar(Math.max(0.5, 1 + d))
    v.x *= cfg.scala[0]
    v.y *= cfg.scala[1]
    v.z *= cfg.scala[2]
    poz.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

// Metrici pentru validarea unicității (raportate în consolă la ?debugforme).
export function metriciForma(geo, cfg) {
  geo.computeBoundingBox()
  const cutie = geo.boundingBox
  const mar = new THREE.Vector3()
  cutie.getSize(mar)
  const poz = geo.attributes.position
  const v = new THREE.Vector3()
  let rMin = Infinity
  let rMax = 0
  for (let i = 0; i < poz.count; i += 7) {
    v.fromBufferAttribute(poz, i)
    const r = v.length()
    if (r < rMin) rMin = r
    if (r > rMax) rMax = r
  }
  return {
    id: cfg.id,
    lobi: cfg.lobii.length,
    adancituri: cfg.adancituri.length,
    aspectXY: +(mar.x / mar.y).toFixed(3),
    aspectXZ: +(mar.x / mar.z).toFixed(3),
    raportRaze: +(rMax / rMin).toFixed(3),
    razaMax: +rMax.toFixed(3),
  }
}
