import * as THREE from 'three'
import { SLIME, extrageSlime, curataSlime, metriciSlime, valideazaSlime } from './slimeSdf.js'
import { createMarbledBlobMaterial, SEEDURI_MARMURA } from './material.js'
import { creeazaMediu, creeazaLumini } from '../blob-lab/createLighting.js'

/* Galerie 6 bloburi: UN singur renderer + o singură textură de mediu,
   o singură cameră per celulă (scissor multi-view, patternul oficial
   three.js pentru vederi multiple). Programul shader e comun tuturor
   (același cod), diferă doar uniformele per material. Celulele în afara
   ecranului nu se randează. */

const stareEl = document.getElementById('stare-galerie')
const grila = document.getElementById('grila')
const btnPauza = document.getElementById('btn-pauza-galerie')
const btnTema = document.getElementById('btn-tema-galerie')

function eroare(mesaj) {
  if (stareEl) {
    stareEl.hidden = false
    stareEl.textContent = mesaj
  }
}

const canvas = document.getElementById('panorama')
if (!canvas) {
  throw new Error('lipsa canvas #panorama')
}

let renderer = null
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
} catch (e) {
  eroare('WebGL nu a putut porni pe acest dispozitiv.')
  throw e
}
if (!renderer.getContext()) {
  eroare('Contextul WebGL nu este disponibil.')
  throw new Error('no-webgl-context')
}

const mobil = window.matchMedia && window.matchMedia('(max-width: 767px)').matches
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobil ? 1.5 : 2))
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.autoClear = true

// Mediu comun (o singură textură PMREM pentru toate scenele).
const mediuComun = creeazaMediu(renderer)

// Construiește celulele + scenele (sincron, rapid). Geometria SDF grea se
// extrage asincron, formă cu formă, ca pagina să rămână responsivă.
// Separare geometrie/AFIȘARE (§5): generatorul produce modele normalizate
// (rază 1.35); mărimea vizuală e parametru de card, nu de geometrie.
const MARIMI = { 0: 'mediu', 1: 'mediu', 2: 'mic', 3: 'mare', 4: 'mic', 5: 'mediu', 6: 'mare' }
const UMPLERE = { mare: 1.0, mediu: 0.62, mic: 0.38 }
const vederi = []
const compuneri = []
const metrici = []
const geometrieProvizorie = new THREE.SphereGeometry(0.001, 6, 4)
SLIME.forEach((cfg, i) => {
  const marime = MARIMI[i] || 'mediu'
  const material = createMarbledBlobMaterial(1 / 1.35, SEEDURI_MARMURA[i % SEEDURI_MARMURA.length])
  const mesh = new THREE.Mesh(geometrieProvizorie, material)
  mesh.visible = false
  // Toate formele pornesc din vedere frontală canonică (aceeași pentru
  // validare); rotația automată adaugă viață, nu ascunde forma proiectată.
  mesh.rotation.y = 0
  const scena = new THREE.Scene()
  scena.environment = mediuComun
  creeazaLumini(scena)
  scena.add(mesh)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60)
  camera.position.set(0.35, 0.25, 8)
  camera.lookAt(0, 0, 0)

  const celula = document.createElement('section')
  celula.className = 'bgal-celula ' + marime
  celula.innerHTML =
    `<div class="bgal-scena" data-vedere="${cfg.id}"></div>` +
    `<div class="bgal-eticheta"><h2>${cfg.nume}</h2><p>${cfg.descriere}</p></div>`
  grila.appendChild(celula)
  const scenaEl = celula.querySelector('.bgal-scena')
  vederi.push({ cfg, scena, camera, scenaEl, raza: 1.35, faza: i * 1.7, gata: false, indice: i, umplere: UMPLERE[marime], obiecte: [{ mesh, viteza: 0.0035, faza: i * 1.7 }] })
})

function arataStare(text) {
  if (stareEl) {
    stareEl.hidden = !text
    if (text) stareEl.textContent = text
  }
}

const asteaptaCadru = () => new Promise((rez) => window.requestAnimationFrame(() => rez()))

async function incarcaFormele() {
  arataStare('Se generează formele slime… 0/' + vederi.length)
  await asteaptaCadru()
  await asteaptaCadru()
  for (const v of vederi) {
    await asteaptaCadru()
    try {
      const geo = extrageSlime(v.cfg, 96)
      const mesh = v.obiecte[0].mesh
      mesh.geometry = geo
      mesh.visible = true
      v.raza = geo.boundingSphere ? geo.boundingSphere.radius : 1.35
      v.gata = true
      const validare = valideazaSlime(geo, v.cfg)
      metrici.push({ ...metriciSlime(geo, v.cfg), ...validare, indice: v.indice })
      metrici.sort((a, b) => a.indice - b.indice)
    } catch (e) {
      try {
        console.error('[galerie-slime] ' + v.cfg.id, e)
      } catch (e2) {}
    }
    arataStare('Se generează formele slime… ' + metrici.length + '/' + vederi.length)
    potrivesteCamere()
  }
  construiesteCompunere()
  curataSlime()
  arataStare(null)
  try {
    console.info('[galerie-forme] ' + JSON.stringify(metrici))
  } catch (e) {}
  potrivesteCamere()
}

// Banner compoziție: mare + mediu + mic ÎN ACEEAȘI scenă (renderer comun,
// fără context WebGL nou). Reutilizează geometriile și materialele cardurilor.
function construiesteCompunere() {
  const gaseste = (id) => vederi.find((v) => v.cfg.id === id)
  const specificatii = [
    { id: 'slime7', scala: 0.9, poz: [-2.6, 0.3, 0], viteza: 0.0028 },
    { id: 'slime2', scala: 0.45, poz: [0.5, -0.5, 0], viteza: 0.0035 },
    { id: 'slime5', scala: 0.28, poz: [2.2, 0.9, -0.2], viteza: 0.0042 },
    { id: 'slime3', scala: 0.25, poz: [1.8, -0.55, 0.3], viteza: 0.0031 },
  ]
  const scena = new THREE.Scene()
  scena.environment = mediuComun
  creeazaLumini(scena)
  const obiecte = []
  specificatii.forEach((s, k) => {
    const sursa = gaseste(s.id)
    if (!sursa || !sursa.gata) return
    const baza = sursa.obiecte[0].mesh
    const mesh = new THREE.Mesh(baza.geometry, baza.material)
    mesh.scale.setScalar(s.scala)
    mesh.position.set(s.poz[0], s.poz[1], s.poz[2])
    scena.add(mesh)
    obiecte.push({ mesh, viteza: s.viteza, faza: k * 2.1 })
  })
  if (!obiecte.length) return
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60)
  const celula = document.createElement('section')
  celula.className = 'bgal-celula bgal-compus'
  celula.innerHTML =
    '<div class="bgal-scena" data-vedere="compunere"></div>' +
    '<div class="bgal-eticheta"><h2>Compoziție — mare / mediu / mic</h2><p>Același model normalizat la scări de afișare diferite, fără suprapuneri.</p></div>'
  grila.appendChild(celula)
  const scenaEl = celula.querySelector('.bgal-scena')
  compuneri.push({ scena, camera, scenaEl, gata: true, compus: true, latimeVizibila: 7.4, obiecte })
}
try {
  window.__galerie = {
    metrici: () => metrici,
    vederi: () => vederi.length,
    gata: () => metrici.length,
    compuneri: () => compuneri.length,
    debug: () =>
      vederi.map((v) => ({
        id: v.cfg.id,
        raza: +v.raza.toFixed(3),
        umplere: v.umplere,
        camZ: +v.camera.position.z.toFixed(3),
        aspect: +v.camera.aspect.toFixed(3),
        rect: [Math.round(v.scenaEl.getBoundingClientRect().width), Math.round(v.scenaEl.getBoundingClientRect().height)],
        geoRaza: v.obiecte[0].mesh.geometry.boundingSphere ? +v.obiecte[0].mesh.geometry.boundingSphere.radius.toFixed(3) : null,
      })),
    debugComp: () =>
      compuneri.map((c) => ({
        camZ: +c.camera.position.z.toFixed(3),
        aspect: +c.camera.aspect.toFixed(3),
        rect: [Math.round(c.scenaEl.getBoundingClientRect().width), Math.round(c.scenaEl.getBoundingClientRect().height)],
        obiecte: c.obiecte.map((o) => ({
          scala: o.mesh.scale.x,
          poz: o.mesh.position.toArray().map((n) => +n.toFixed(2)),
          geoRaza: o.mesh.geometry.boundingSphere ? +o.mesh.geometry.boundingSphere.radius.toFixed(3) : null,
        })),
      })),
  }
} catch (e) {}

// Potrivește camerele: cardurile umplu fracția proprie din latura minimă
// (sistem de mărimi), compunerea încadrează lățimea vizibilă.
function potrivesteCamere() {
  const fovRad = THREE.MathUtils.degToRad(30)
  const tan = Math.tan(fovRad / 2)
  for (const v of vederi) {
    const r = v.scenaEl.getBoundingClientRect()
    const minim = Math.max(50, Math.min(r.width, r.height))
    const d = v.raza / (tan * v.umplere * Math.min(1, Math.max(0.4, r.width / Math.max(1, r.height))))
    v.camera.position.set(0.35, 0.25, d)
    v.camera.lookAt(0, 0, 0)
    v.camera.aspect = Math.max(0.2, r.width / Math.max(1, r.height))
    v.camera.updateProjectionMatrix()
    v.minim = minim
  }
  for (const c of compuneri) {
    const r = c.scenaEl.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) continue
    const aspect = r.width / Math.max(1, r.height)
    const d = c.latimeVizibila / (2 * tan * aspect)
    c.camera.position.set(0, 0, d)
    c.camera.lookAt(0, 0, 0)
    c.camera.aspect = Math.max(0.2, aspect)
    c.camera.updateProjectionMatrix()
  }
}
potrivesteCamere()

const reduceMiscare = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const staticParam = new URLSearchParams(window.location.search).has('static')
let ruleaza = !reduceMiscare && !staticParam

function deseneazaCadru(timp) {
  const t = timp / 1000
  const inaltime = window.innerHeight
  renderer.setScissorTest(true)
  const toate = compuneri.length ? vederi.concat(compuneri) : vederi
  for (const v of toate) {
    if (!v.gata) continue
    const r = v.scenaEl.getBoundingClientRect()
    if (r.bottom < -50 || r.top > inaltime + 50 || r.width < 10 || r.height < 10) continue
    for (const o of v.obiecte) {
      o.mesh.rotation.y += o.viteza
      o.mesh.rotation.x = Math.sin(t * 0.3 + o.faza) * 0.06
    }
    const jos = Math.round(inaltime - r.bottom)
    renderer.setViewport(Math.round(r.left), jos, Math.round(r.width), Math.round(r.height))
    renderer.setScissor(Math.round(r.left), jos, Math.round(r.width), Math.round(r.height))
    renderer.render(v.scena, v.camera)
  }
  renderer.setScissorTest(false)
}

function bucla(t) {
  if (!ruleaza) return
  deseneazaCadru(t || 0)
  window.requestAnimationFrame(bucla)
}
if (ruleaza) {
  incarcaFormele()
  window.requestAnimationFrame(bucla)
} else {
  incarcaFormele().then(() => deseneazaCadru(1200))
}

let vizibilDoc = true
document.addEventListener('visibilitychange', () => {
  vizibilDoc = document.visibilityState === 'visible'
  if (vizibilDoc && ruleaza) window.requestAnimationFrame(bucla)
})

// Eliberează resursele GPU la părăsirea paginii (context WebGL unic).
window.addEventListener('pagehide', () => {
  ruleaza = false
  try {
    renderer.dispose()
  } catch (e) {}
})

let tmp = 0
function laSchimbare() {
  window.clearTimeout(tmp)
  tmp = window.setTimeout(() => {
    potrivesteCamere()
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    if (!ruleaza) deseneazaCadru(1200)
  }, 150)
}
window.addEventListener('resize', laSchimbare)
if (window.ResizeObserver) {
  try {
    const ro = new ResizeObserver(() => laSchimbare())
    ro.observe(grila)
  } catch (e) {}
}
renderer.setSize(window.innerWidth, window.innerHeight, false)

if (btnPauza) {
  if (!ruleaza) {
    btnPauza.disabled = true
    btnPauza.textContent = 'Redare oprită'
  } else {
    btnPauza.addEventListener('click', () => {
      ruleaza = !ruleaza
      btnPauza.textContent = ruleaza ? 'Pauză' : 'Redare'
      btnPauza.setAttribute('aria-pressed', String(!ruleaza))
      if (ruleaza) window.requestAnimationFrame(bucla)
    })
  }
}
if (btnTema) {
  btnTema.addEventListener('click', () => {
    const radacina = document.documentElement
    const intunecat = radacina.getAttribute('data-fundal') === 'intunecat'
    radacina.setAttribute('data-fundal', intunecat ? 'deschis' : 'intunecat')
    btnTema.textContent = intunecat ? 'Fundal: deschis' : 'Fundal: întunecat'
    btnTema.setAttribute('aria-pressed', String(!intunecat))
  })
}
