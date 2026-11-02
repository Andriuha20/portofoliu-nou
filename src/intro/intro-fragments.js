import * as THREE from 'three'
import { createShardMaterial } from './intro-material.js'

/* ——— Intro: fragmente de membrană glass + microdropleturi (fazele B–C) ———
   Cioburi curbate cu materialul GLASS Codex (instanțe proprii, același program
   GPU), estompate via `uIntroFade` (nu via opacity — shaderul glass nu o
   citește). Geometria peticelor e pe sferă unitară (ca `vLocal` să aibă aceeași
   scară ca bula), cu atributul `aCurvature` cerut de vertex shader. */

const NR_CIOBURI = 16
const NR_PICATURI = 26
// Cioburile traiesc pana la ~2.45s (resturiDeLa 0.45 + 2.0): zbor, plutire
// in jurul portalului, estompare graduala — suprapunere cu reveal-ul.
const DURATA_RESTURI = 2.0

function directieAleatoare(fnRandom) {
  const u = fnRandom() * 2 - 1
  const a = fnRandom() * Math.PI * 2
  const s = Math.sqrt(Math.max(0, 1 - u * u))
  return new THREE.Vector3(s * Math.cos(a), s * Math.sin(a), u)
}

/** Eșantionare pură (testabilă): direcții de cioburi, ferite de gaura inițială. */
export function sampleShardDirections(count, hitDir, fnRandom = Math.random) {
  const dirs = []
  let paza = 0
  while (dirs.length < count && paza < count * 40) {
    paza += 1
    const v = directieAleatoare(fnRandom)
    if (v.angleTo(hitDir) < 0.5) {
      v.sub(hitDir.clone().multiplyScalar(1.6)).normalize()
    }
    dirs.push(v.clone().normalize())
  }
  return dirs
}

/** Curba de estompare a cioburilor: vizibile la început, dispar delicat. */
export function shardFade(t) {
  if (t < 0.3) return 1
  const k = (t - 0.3) / 0.7
  return Math.max(0, 1 - k * k * (3 - 2 * k))
}

function texturaSprite() {
  const S = 64
  const data = new Uint8Array(S * S * 4)
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const dx = (x - S / 2 + 0.5) / (S / 2)
      const dy = (y - S / 2 + 0.5) / (S / 2)
      const d = Math.min(1, Math.hypot(dx, dy))
      const a = Math.pow(Math.max(0, 1 - d), 2.2)
      const i = (y * S + x) * 4
      data[i] = 255
      data[i + 1] = 250
      data[i + 2] = 255
      data[i + 3] = Math.round(a * 255)
    }
  }
  const tex = new THREE.DataTexture(data, S, S)
  tex.needsUpdate = true
  return tex
}

const CULORI_PICATURI = [0x7fe9ff, 0xff7ae2, 0xb79bff, 0xe8fbff, 0x6fa8ff, 0xff9ed1]

function atributCurbura(geo) {
  const n = geo.attributes.position.count
  geo.setAttribute('aCurvature', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
  return geo
}

export function createRuptureDebris({ center, radius, hitDir, environment, dark = 0, seed = Math.random }) {
  const group = new THREE.Group()
  group.position.copy(center)
  group.scale.setScalar(radius)
  const cioburi = []

  const dirs = sampleShardDirections(NR_CIOBURI, hitDir, seed)
  const sus = new THREE.Vector3(0, 1, 0)
  dirs.forEach((dir, i) => {
    const marime = 0.3 + seed() * 0.32
    const geo = atributCurbura(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, marime))
    // Forme neregulate de sticla sparta: jitter radial deterministic pe
    // varfuri (pastreaza teselarea neteda, silueta devine neregulata).
    try {
      const poz = geo.getAttribute('position')
      const nor = geo.getAttribute('normal')
      const ampl = 0.16 * marime
      for (let v = 0; v < poz.count; v += 1) {
        const j = (seed() - 0.5) * 2 * ampl
        poz.setXYZ(
          v,
          poz.getX(v) + nor.getX(v) * j,
          poz.getY(v) + nor.getY(v) * j,
          poz.getZ(v) + nor.getZ(v) * j,
        )
      }
      poz.needsUpdate = true
      geo.computeVertexNormals()
      atributCurbura(geo)
    } catch (e) {}
    const mat = createShardMaterial(environment)
    mat.uniforms.uDark.value = dark
    mat.uniforms.uPhase.value = i * 0.7 + 0.4
    mat.uniforms.uMotion.value = 1
    const mesh = new THREE.Mesh(geo, mat)
    mesh.quaternion.setFromUnitVectors(sus, dir)
    mesh.rotateY(seed() * Math.PI * 2)
    mesh.position.copy(dir).multiplyScalar(0.985)
    mesh.renderOrder = 2
    mesh.frustumCulled = false
    const departe = dir
      .clone()
      .multiplyScalar(1.25)
      .sub(hitDir.clone().multiplyScalar(0.55))
      .normalize()
    // Viteze în unități-normalizate/s (grupul e scalat cu radius).
    const viteza = (130 + seed() * 220) / radius
    group.add(mesh)
    cioburi.push({
      mesh,
      vel: new THREE.Vector3(departe.x * viteza, departe.y * viteza, (40 + seed() * 120) / radius),
      axa: directieAleatoare(seed),
      vitezaUnghi: (1.5 + seed() * 4) * (seed() < 0.5 ? -1 : 1),
      opacitate0: 1,
    })
  })

  const pozitii = new Float32Array(NR_PICATURI * 3)
  const culori = new Float32Array(NR_PICATURI * 3)
  const picaturi = []
  const culoare = new THREE.Color()
  for (let i = 0; i < NR_PICATURI; i += 1) {
    const inel = directieAleatoare(seed)
      .multiplyScalar(0.35)
      .add(hitDir)
      .normalize()
    const p = inel.clone().multiplyScalar(0.9 + seed() * 0.2)
    pozitii.set([p.x, p.y, p.z + 20 / radius], i * 3)
    const viteza = (150 + seed() * 230) / radius
    culoare.set(CULORI_PICATURI[(i * 2 + 1) % CULORI_PICATURI.length])
    culori.set([culoare.r, culoare.g, culoare.b], i * 3)
    picaturi.push({
      vel: new THREE.Vector3(inel.x * viteza, inel.y * viteza, (60 + seed() * 160) / radius),
      viata: 0.7 + seed() * 0.5,
      culoare0: [culoare.r, culoare.g, culoare.b],
    })
  }
  const geoP = new THREE.BufferGeometry()
  geoP.setAttribute('position', new THREE.BufferAttribute(pozitii, 3))
  geoP.setAttribute('color', new THREE.BufferAttribute(culori, 3))
  const matP = new THREE.PointsMaterial({
    map: texturaSprite(),
    size: Math.max(7 / radius, 0.06),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geoP, matP)
  points.renderOrder = 3
  points.frustumCulled = false
  group.add(points)

  let timp = 0
  function update(dt, timpUniforma) {
    timp += dt
    const t = Math.min(1, timp / DURATA_RESTURI)
    const fade = shardFade(t)
    cioburi.forEach((c) => {
      c.mesh.position.addScaledVector(c.vel, dt)
      c.vel.multiplyScalar(1 - 1.6 * dt)
      c.vel.y -= (55 / radius) * dt
      c.mesh.rotateOnWorldAxis(c.axa, c.vitezaUnghi * dt * (1 - t * 0.5))
      c.mesh.material.uniforms.uIntroFade.value = fade
      if (timpUniforma !== undefined) c.mesh.material.uniforms.uTime.value = timpUniforma
    })
    const pos = geoP.getAttribute('position')
    const col = geoP.getAttribute('color')
    picaturi.forEach((p, i) => {
      const px = pos.getX(i) + p.vel.x * dt
      const py = pos.getY(i) + p.vel.y * dt
      const pz = pos.getZ(i) + p.vel.z * dt
      p.vel.multiplyScalar(1 - 1.2 * dt)
      p.vel.y -= (70 / radius) * dt
      pos.setXYZ(i, px, py, pz)
      const k = Math.max(0, 1 - timp / p.viata)
      col.setXYZ(i, p.culoare0[0] * k, p.culoare0[1] * k, p.culoare0[2] * k)
    })
    pos.needsUpdate = true
    col.needsUpdate = true
    matP.opacity = 1 - t
    return t
  }

  function dispose() {
    cioburi.forEach((c) => {
      c.mesh.geometry.dispose()
      c.mesh.material.dispose()
    })
    geoP.dispose()
    matP.map.dispose()
    matP.dispose()
  }

  function setDark(d) {
    cioburi.forEach((c) => {
      c.mesh.material.uniforms.uDark.value = d
    })
  }

  return { group, update, dispose, setDark, durata: DURATA_RESTURI }
}
