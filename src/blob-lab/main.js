import * as THREE from 'three'
import { creeazaBlob, creeazaMaterialRezerva, creeazaMaterialCamp } from './createBlob.js'
import { creeazaMediu, creeazaLumini } from './createLighting.js'

/* Blob Lab — previzualizare izolată a unui singur blob lichid-sticlă 3D.
   Nu importă nimic din portofoliu; portofoliul nu importă nimic de aici.
   Include autotest la pornire cu fallback progresiv de material
   (physical → standard → basic), ca pagina să nu rămână niciodată goală
   fără un mesaj de eroare lizibil. */

const canvas = document.getElementById('scena')
const stareEl = document.getElementById('stare')
const btnPauza = document.getElementById('btn-pauza')
const btnTema = document.getElementById('btn-tema')

const jurnal = []
function logEtapa(mesaj) {
  jurnal.push(mesaj)
  try { console.info('[blob-lab] ' + mesaj) } catch (e) {}
}

function eroare(mesaj) {
  logEtapa('EROARE: ' + mesaj)
  if (stareEl) {
    stareEl.hidden = false
    stareEl.textContent = mesaj
  }
}

let renderer = null
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
} catch (e) {
  eroare('WebGL nu a putut porni pe acest dispozitiv (' + (e && e.message ? e.message : e) + '). Încearcă un browser cu accelerare hardware.')
  throw e
}
if (!renderer.getContext()) {
  eroare('Contextul WebGL nu este disponibil pe acest dispozitiv.')
  throw new Error('no-webgl-context')
}
logEtapa('renderer WebGL creat, context disponibil')

const mobil = window.matchMedia && window.matchMedia('(max-width: 767px)').matches
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobil ? 1.5 : 2))
renderer.setClearColor(0x000000, 0) // fundal transparent, fără culoare coaptă
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scena = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
// Ușor trei-sferturi: adâncime și asimetrie vizibile din primul cadru.
camera.position.set(0.85, 0.5, 6)
camera.lookAt(0, 0, 0)

scena.environment = creeazaMediu(renderer)
creeazaLumini(scena)

const blob = creeazaBlob(mobil ? 24 : 40)
scena.add(blob)

// Potrivește dimensiunea aparentă la ~350px pe desktop.
let incercariPotrivire = 0
function potriveste() {
  const w = canvas.clientWidth || 0
  const h = canvas.clientHeight || 0
  if (w < 2 || h < 2) {
    // Layout încă neaplicat (CSS neîncărcat?): reîncearcă la cadrul următor.
    incercariPotrivire++
    if (incercariPotrivire < 60) window.requestAnimationFrame(potriveste)
    else eroare('Canvasul are dimensiune zero — verifică CSS-ul (#scena).')
    return false
  }
  incercariPotrivire = 0
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  const raza = (blob.geometry.boundingSphere ? blob.geometry.boundingSphere.radius : 1.2) * 1.02
  const inaltimeVizibila = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const tintaPx = Math.min(420, Math.max(220, Math.min(w, h) * 0.52))
  let scara = ((tintaPx / h) * inaltimeVizibila) / (raza * 2)
  if (!Number.isFinite(scara) || scara <= 0) scara = 0.5
  blob.scale.setScalar(Math.min(8, Math.max(0.05, scara)))
  camera.updateProjectionMatrix()
  return true
}
potriveste()

/* Autotest de randare: un cadru real, apoi citirea pixelilor centrali.
   Fundalul e transparent (alpha 0), deci orice pixel cu alpha înseamnă
   geometrie vizibilă. Rulează sincron, fără preserveDrawingBuffer. */
function cadruTest() {
  deseneaza(1200, true)
  try {
    const gl = renderer.getContext()
    const marime = renderer.getDrawingBufferSize(new THREE.Vector2())
    const latura = 8
    const px = new Uint8Array(latura * latura * 4)
    gl.readPixels(
      Math.max(0, Math.floor(marime.x / 2 - latura / 2)),
      Math.max(0, Math.floor(marime.y / 2 - latura / 2)),
      latura, latura, gl.RGBA, gl.UNSIGNED_BYTE, px,
    )
    let vii = 0
    for (let i = 3; i < px.length; i += 4) if (px[i] > 12) vii++
    return vii
  } catch (e) {
    logEtapa('readPixels indisponibil: ' + (e && e.message ? e.message : e))
    return -1
  }
}

const reduceMiscare = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let ruleaza = !reduceMiscare
let rotireAutomata = true

// Parallax fin la cursor (doar rotație ușoară, fără deplasarea blobului).
let tx = 0
let ty = 0
let cx = 0
let cy = 0
let cadre = 0
const cursorFin = !reduceMiscare && window.matchMedia && window.matchMedia('(pointer: fine)').matches
if (cursorFin) {
  window.addEventListener('mousemove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2
    ty = (e.clientY / window.innerHeight - 0.5) * 2
  }, { passive: true })
}

// Lanț progresiv de material: physical → standard → basic.
// (Starea de animație e declarată mai sus tocmai pentru ca autotestul,
// care randează un cadru real, să nu lovească zona temporal moartă.)
let etapaMaterial = 'physical'
function aplicaMaterialEtapa(etapa) {
  const vechi = blob.material
  if (etapa === 'physical') return true // deja setat la creare
  if (etapa === 'camp') {
    const raza = blob.geometry.boundingSphere ? blob.geometry.boundingSphere.radius : 1.4
    blob.material = creeazaMaterialCamp(1 / Math.max(0.5, raza))
  } else {
    blob.material = creeazaMaterialRezerva(etapa)
  }
  if (vechi && vechi.dispose) { try { vechi.dispose() } catch (e) {} }
  etapaMaterial = etapa
  return true
}
try {
  const fortat = new URLSearchParams(window.location.search).get('material')
  if (fortat === 'standard' || fortat === 'basic' || fortat === 'camp') {
    aplicaMaterialEtapa(fortat)
    logEtapa('material forțat prin ?material=' + fortat)
  } else {
    let vii = cadruTest()
    logEtapa('autotest physical: ' + vii + '/64 pixeli cu alpha')
    if (vii >= 0 && vii < 3) {
      aplicaMaterialEtapa('standard')
      vii = cadruTest()
      logEtapa('autotest standard: ' + vii + '/64 pixeli cu alpha')
      if (vii >= 0 && vii < 3) {
        aplicaMaterialEtapa('basic')
        vii = cadruTest()
        logEtapa('autotest basic: ' + vii + '/64 pixeli cu alpha')
        if (vii >= 0 && vii < 3) {
          eroare(
            'Randarea e goală pe toate materialele (' + vii + '/64). ' +
            'Geometrie: ' + (blob.geometry.boundingSphere ? 'ok' : 'lipsă') + '. ' +
            'Canvas: ' + canvas.clientWidth + 'x' + canvas.clientHeight + '. ' +
            'Vezi ?debuglab pentru detalii.',
          )
        }
      }
    }
  }
} catch (e) {
  eroare('Autotestul a eșuat cu excepție: ' + (e && e.message ? e.message : e))
}
if (stareEl && stareEl.hidden !== false) { try { stareEl.hidden = true } catch (e) {} }
logEtapa('material activ: ' + etapaMaterial)

// Expune starea pentru depanare din consolă.
try {
  window.__blobLab = {
    etapa: () => etapaMaterial,
    jurnal: () => jurnal.slice(),
    info: () => ({
      canvas: [canvas.clientWidth, canvas.clientHeight],
      buf: (() => { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); return [s.x, s.y] })(),
      mesh: { poz: blob.position.toArray(), scara: blob.scale.x, vizibil: blob.visible },
      margini: blob.geometry.boundingSphere ? { c: blob.geometry.boundingSphere.center.toArray(), r: blob.geometry.boundingSphere.radius } : null,
      camera: { poz: camera.position.toArray(), fov: camera.fov, aspect: camera.aspect },
      apeluriDesen: renderer.info.render.calls,
    }),
  }
} catch (e) {}

function deseneaza(timp, oSinguraData = false) {
  const t = timp / 1000
  cx += (tx - cx) * 0.045
  cy += (ty - cy) * 0.045
  if (rotireAutomata && !oSinguraData) blob.rotation.y = t * 0.15
  else if (oSinguraData) blob.rotation.y = 0.5
  blob.rotation.x = Math.sin(t * 0.3) * 0.07 - cy * 0.18
  blob.rotation.z = cx * 0.08
  blob.position.y = Math.sin(t * 0.6) * 0.07
  renderer.render(scena, camera)
  cadre++
}

let vizibil = true
if ('IntersectionObserver' in window) {
  new IntersectionObserver((intrari) => {
    vizibil = intrari.some((i) => i.isIntersecting)
  }).observe(canvas)
}

function bucla(t) {
  if (!ruleaza) return
  if (vizibil) deseneaza(t || 0)
  window.requestAnimationFrame(bucla)
}
if (reduceMiscare) {
  if (btnPauza) {
    btnPauza.disabled = true
    btnPauza.textContent = 'Redare oprită (reduced motion)'
  }
  deseneaza(1200, true)
} else {
  window.requestAnimationFrame(bucla)
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ruleaza && !reduceMiscare) {
    window.requestAnimationFrame(bucla)
  }
})

// Eliberează resursele GPU la părăsirea paginii (context WebGL unic).
window.addEventListener('pagehide', () => {
  ruleaza = false
  try {
    renderer.dispose()
  } catch (e) {}
})

let tmp = 0
function laRedimensionare() {
  window.clearTimeout(tmp)
  tmp = window.setTimeout(potriveste, 150)
}
window.addEventListener('resize', laRedimensionare)
if (window.ResizeObserver && canvas.parentElement) {
  try {
    const ro = new ResizeObserver(() => laRedimensionare())
    ro.observe(canvas.parentElement)
  } catch (e) {}
}

// Export imagine transparentă din browser.
// ?exportpng → PNG 2048px (comportament original, neschimbat).
// ?export=png|webp&marime=N → format și latură la alegere (ex: 2048).
function exportaImagine(format, marime, numeFisier) {
  try {
    const L = Math.min(4096, Math.max(512, marime || 2048))
    const tip = format === 'webp' ? 'image/webp' : 'image/png'
    renderer.setSize(L, L, false)
    camera.aspect = 1
    camera.updateProjectionMatrix()
    deseneaza(1200, true)
    canvas.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = numeFisier || (format === 'webp' ? 'blob-premium.webp' : 'blob-premium.png')
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    }, tip, 0.92)
    window.setTimeout(potriveste, 100)
  } catch (e) {}
}
function exportaPNG() {
  exportaImagine('png', 2048, 'blob-premium.png')
}
if (new URLSearchParams(window.location.search).has('exportpng')) {
  window.setTimeout(exportaPNG, 600)
}
{
  const params = new URLSearchParams(window.location.search)
  const format = params.get('export')
  if (format === 'png' || format === 'webp') {
    const marime = parseInt(params.get('marime') || '2048', 10)
    window.setTimeout(() => exportaImagine(format, marime), 600)
  }
}

// Controale izolate (doar pagina lab — nu ating portofoliul).
if (btnPauza && !reduceMiscare) {
  btnPauza.addEventListener('click', () => {
    ruleaza = !ruleaza
    btnPauza.textContent = ruleaza ? 'Pauză' : 'Redare'
    btnPauza.setAttribute('aria-pressed', String(!ruleaza))
    if (ruleaza) window.requestAnimationFrame(bucla)
    else deseneaza(performance.now(), true)
  })
}
const btnRotire = document.getElementById('btn-rotire')
if (btnRotire && !reduceMiscare) {
  btnRotire.addEventListener('click', () => {
    rotireAutomata = !rotireAutomata
    btnRotire.textContent = rotireAutomata ? 'Rotire automată: pornită' : 'Rotire automată: oprită'
    btnRotire.setAttribute('aria-pressed', String(rotireAutomata))
  })
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

/* Panou diagnostic dezvoltare (?debuglab): WebGL, dimensiuni canvas,
   scenă, mesh, cameră, cadre randate, jurnal etape. Nu apare implicit. */
if (new URLSearchParams(window.location.search).has('debuglab')) {
  try {
    const panou = document.createElement('div')
    panou.id = 'lab-debug'
    panou.setAttribute('aria-hidden', 'true')
    panou.style.cssText = 'position:fixed;left:12px;top:12px;z-index:99;max-width:360px;background:rgba(0,0,0,.82);color:#0f0;font:12px/1.5 monospace;white-space:pre-wrap;padding:12px 14px;border-radius:10px;pointer-events:none;';
    document.body.appendChild(panou)
    const info = window.__blobLab ? window.__blobLab.info() : {};
    panou.textContent =
      'BLOB LAB — diagnostic\n' +
      'webgl: ok | canvas: ' + canvas.clientWidth + 'x' + canvas.clientHeight + '\n' +
      'mesh vizibil: ' + blob.visible + ' | scara: ' + blob.scale.x.toFixed(3) + '\n' +
      'margini: ' + JSON.stringify(info.margini) + '\n' +
      'camera: ' + JSON.stringify(info.camera) + '\n' +
      'jurnal:\n- ' + jurnal.join('\n- ');
    window.setInterval(() => {
      try {
        const i2 = window.__blobLab.info()
        panou.textContent = panou.textContent.split('\nCadre:')[0] + '\nCadre: ' + cadre + ' | apeluri: ' + i2.apeluriDesen;
      } catch (e) {}
    }, 1000)
  } catch (e) {}
}
