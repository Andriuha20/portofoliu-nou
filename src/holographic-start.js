/* ——— Pornire in etape a scenei holografice (seamless cu intro) ———
   Acelasi continut ca glass-design.js din Experiment 2 (creare heroExperience,
   ancore, resurse, scena), dar decuplat astfel incat click-ul sa nu blocheze
   niciodata firul principal:
   - prepareHolographic(): fetch + decode pachete, FARA WebGL (in idle).
   - startHolographic({ paused: true }): creeaza tot + UN SINGUR frame de
     incalzire in idle; AMANA daca burst-ul ruleaza (poll usor, max ~8s).
   - unpauseHolographic(): porneste bucla la reveal (cadre deja compilate).
   - isHeroReady(): primul frame randat sau esec (nu blocheaza reveal-ul).
   Fara WebGL / la eroare: ramane fundalul paginii (ca in Experiment 2). */
import { createBubbleAnchors } from './holographic/layout.js'
import { createBubbleScene } from './holographic/scene.js'
import { prepareBubbleResources } from './holographic/resources.js'
import { createHeroExperience } from './hero-experience.js'

let stare = null
let resursePregatite = null
let pregatireInCurs = null
let creareInCurs = null
let asteaptaNepauzat = false
let heroGata = false

function marcheazaHeroGata(motiv) {
  if (heroGata) return
  heroGata = true
  try { performance.mark('bubbles:first-frame') } catch {}
  try { console.info(`[holo] hero-ready (${motiv})`) } catch {}
}

export function prepareHolographic() {
  if (resursePregatite) return Promise.resolve(resursePregatite)
  if (!pregatireInCurs) {
    try { performance.mark('bubbles:prepare-start') } catch {}
    const t0 = Date.now()
    pregatireInCurs = prepareBubbleResources().then((p) => {
      resursePregatite = p
      try { performance.mark('bubbles:prepare-ready') } catch {}
      try { console.info(`[holo] resurse pregatite in ${Date.now() - t0}ms (fetch+decode, fara WebGL)`) } catch {}
      return p
    }).catch((e) => {
      pregatireInCurs = null
      throw e
    })
  }
  return pregatireInCurs
}

export function isHeroReady() {
  return heroGata
}

function urmarestePrimulFrame() {
  try {
    const canvas = document.getElementById('holographic-scene')
    if (!canvas) { marcheazaHeroGata('fara-canvas'); return }
    if (canvas.dataset.ready === 'true') { marcheazaHeroGata('deja-randat'); return }
    const obs = new MutationObserver(() => {
      if (canvas.dataset.ready === 'true') {
        try { obs.disconnect() } catch {}
        marcheazaHeroGata('primul-frame')
      }
    })
    obs.observe(canvas, { attributes: true, attributeFilter: ['data-ready'] })
  } catch {
    marcheazaHeroGata('observare-esuata')
  }
}

export async function startHolographic(opts = {}) {
  // Implicit (fara argumente): pornire completa, ne-pauzata. Pauza doar la
  // cerere explicita { paused: true } (idle-ul intro-ului).
  const faraPauza = !opts.paused
  if (stare) {
    if (faraPauza) unpauseHolographic()
    return true
  }
  if (creareInCurs) {
    if (faraPauza) asteaptaNepauzat = true
    try { await creareInCurs } catch {}
    return !!stare
  }
  creareInCurs = construieste(!!opts.paused)
  try { await creareInCurs } catch {}
  creareInCurs = null
  return !!stare
}

// Faza intro-ului (null = overlay absent: complet sau no-intro).
function introFaza() {
  try { return document.querySelector('.intro-overlay')?.dataset.introFaza ?? null } catch { return null }
}

async function construieste(pauzatCerut) {
  try {
    // Daca burst-ul ruleaza ACUM, amanarea e obligatorie: niciun bloc
    // sincron nu are voie in cadrele rupturii. Maxim ~8s, apoi se forteaza
    // (nu blocam pagina la nesfarsit).
    let asteptari = 0
    while (pauzatCerut) {
      const f = introFaza()
      if (f === null || f === 'idle' || f === 'complete') break
      if (asteptari >= 20) break
      asteptari++
      await new Promise((r) => setTimeout(r, 400))
    }
    const heroExperience = createHeroExperience()
    const anchors = createBubbleAnchors()
    performance.mark('bubbles:entry')
    performance.mark('bubbles:module-ready')
    const prepared = resursePregatite ?? await prepareHolographic()
    // Pauza doar daca overlay-ul inca exista (altfel porneste direct).
    // Dupa creare, daca intre timp s-a cerut nepauzat sau overlay-ul a
    // disparut, bucla porneste imediat.
    const pauza = pauzatCerut && introFaza() !== null
    const disposeScene = createBubbleScene(anchors, prepared, heroExperience, { paused: pauza })
    const setPauza = (typeof disposeScene.setPaused === 'function') ? disposeScene.setPaused : null
    stare = { disposeScene, heroExperience, anchors, resources: prepared, setPauza }
    urmarestePrimulFrame()
    if (asteaptaNepauzat || introFaza() === null) unpauseHolographic()
    asteaptaNepauzat = false
    return true
  } catch (error) {
    try { stare?.resources?.dispose() } catch {}
    stare = null
    marcheazaHeroGata('eroare-start')
    console.warn('WebGL artwork unavailable; keeping the page background.', error)
    return false
  }
}

export function unpauseHolographic() {
  try {
    if (stare?.setPauza) {
      stare.setPauza(false)
      return true
    }
    asteaptaNepauzat = true
    return false
  } catch { return false }
}

export function disposeHolographic() {
  if (!stare) return
  asteaptaNepauzat = false
  try { stare.disposeScene?.() } catch {}
  try { stare.heroExperience?.dispose() } catch {}
  try {
    stare.anchors.forEach(({ element, project }) => {
      if (!project && element.parentElement) element.remove()
    })
  } catch {}
  try { stare.resources?.dispose() } catch {}
  stare = null
}

if (import.meta.hot) import.meta.hot.dispose(() => disposeHolographic())
