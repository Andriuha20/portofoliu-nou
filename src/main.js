import './style.css'
import './glass-design.css'
import './ui-polish.css'
import './brand-logo.css'
import './menu-cinematic.css'
import { createMenuTransition } from './menu-transition.js'
import { graphicsQuality } from './graphics-quality.js'

const an = document.getElementById('an')
if (an) {
  an.textContent = String(new Date().getFullYear())
}

/* ——— Tema light/dark (implicit light, stil Nothin') ——— */
const TEMA_KEY = 'tema'
const root = document.documentElement
const metaTheme = document.querySelector('meta[name="theme-color"]')
const toggleBtn = document.getElementById('tema-toggle')
const temaMeniuBtn = document.getElementById('tema-meniu')
const temaMeniuText = temaMeniuBtn ? temaMeniuBtn.querySelector('.menu-tema-text') : null

function aplicaTema(tema) {
  root.setAttribute('data-theme', tema)
  try {
    localStorage.setItem(TEMA_KEY, tema)
  } catch (e) {}
  if (metaTheme) {
    metaTheme.setAttribute('content', tema === 'dark' ? '#0a0a0c' : '#FAFAF8')
  }
  const spre = tema === 'dark' ? 'light' : 'dark'
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-label', `Comută la tema ${spre}`)
    toggleBtn.setAttribute('aria-pressed', tema === 'dark' ? 'true' : 'false')
  }
  if (temaMeniuBtn) {
    temaMeniuBtn.setAttribute('aria-label', `Treci la tema ${spre}`)
    if (temaMeniuText) temaMeniuText.textContent = `Treci la tema ${spre}`
  }
}

function comutaTema() {
  const curenta = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  aplicaTema(curenta === 'dark' ? 'light' : 'dark')
}

let initiala = 'light'
try {
  initiala =
    localStorage.getItem(TEMA_KEY) ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
} catch (e) {}
aplicaTema(initiala)

if (toggleBtn) {
  toggleBtn.addEventListener('click', comutaTema)
}

if (temaMeniuBtn) {
  // Meniul rămâne deschis la schimbarea temei din interiorul lui.
  temaMeniuBtn.addEventListener('click', comutaTema)
}

/* ——— Calitate grafica (Auto/Ridicata/Echilibrata/Redusa) ———
   Control discret in meniu; alegerea se pastreaza local. AUTO adapteaza
   singur nivelul (cu histerezis); scena aplica DPR/geometrie/miscare. */
const butoaneCalitate = Array.from(document.querySelectorAll('[data-calitate]'))
function actualizeazaCalitate() {
  const mod = graphicsQuality.mode
  butoaneCalitate.forEach((buton) => {
    const eActiv = buton.dataset.calitate === mod
    buton.setAttribute('aria-pressed', eActiv ? 'true' : 'false')
    buton.classList.toggle('activ', eActiv)
  })
}
butoaneCalitate.forEach((buton) => {
  buton.addEventListener('click', () => {
    graphicsQuality.setMode(buton.dataset.calitate)
    actualizeazaCalitate()
  })
})
try {
  window.addEventListener('portfolio:graphics-quality', actualizeazaCalitate)
} catch (e) {}
actualizeazaCalitate()

/* ——— Meniu overlay (tranzitie cinematica Experiment 2) ——— */
const meniuBtn = document.getElementById('meniu-btn')
const overlay = document.getElementById('meniu-overlay')
const continut = document.getElementById('continut')
const subsol = document.querySelector('.site-footer')
const primaLegatura = overlay ? overlay.querySelector('.menu-list a') : null
let overflowBeforeMenu = ''
const menuTransition = overlay ? createMenuTransition(overlay, () => {
  setInert(false)
  document.body.style.overflow = overflowBeforeMenu
}) : null

function setInert(pe) {
  ;[continut, subsol].forEach((el) => {
    if (!el || !('inert' in el)) return
    el.inert = pe
  })
}

function inchideMeniu() {
  if (!overlay || !meniuBtn) return
  meniuBtn.setAttribute('aria-expanded', 'false')
  meniuBtn.querySelector('.menu-btn-text').textContent = 'meniu'
  if (overlay.contains(document.activeElement)) meniuBtn.focus({ preventScroll: true })
  if (menuTransition) menuTransition.setOpen(false)
  else {
    overlay.classList.remove('open')
    setInert(false)
    window.setTimeout(() => {
      overlay.hidden = true
    }, 150)
    document.body.style.overflow = ''
  }
}

function deschideMeniu() {
  if (!overlay || !meniuBtn) return
  if (menuTransition) {
    if (overlay.hidden) overflowBeforeMenu = document.body.style.overflow
    setInert(true)
    meniuBtn.setAttribute('aria-expanded', 'true')
    meniuBtn.querySelector('.menu-btn-text').textContent = 'închide'
    document.body.style.overflow = 'hidden'
    menuTransition.setOpen(true)
    if (primaLegatura) primaLegatura.focus({ preventScroll: true })
    return
  }
  overlay.hidden = false
  setInert(true)
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => overlay.classList.add('open'))
  })
  meniuBtn.setAttribute('aria-expanded', 'true')
  meniuBtn.querySelector('.menu-btn-text').textContent = 'închide'
  document.body.style.overflow = 'hidden'
  // Focusul intră în meniu; la Escape se întoarce pe buton (vezi mai jos).
  if (primaLegatura) primaLegatura.focus({ preventScroll: true })
}

if (meniuBtn && overlay) {
  meniuBtn.addEventListener('click', () => {
    const deschis = meniuBtn.getAttribute('aria-expanded') === 'true'
    if (deschis) inchideMeniu()
    else deschideMeniu()
  })
  overlay.querySelectorAll('a').forEach((a) => {
    let pointerStartedInside = true
    a.addEventListener('pointerdown', (e) => {
      // Pe mobil, tapul poate fi retintit spre un link vecin; pastreaza pozitia originala.
      const rect = a.getBoundingClientRect()
      pointerStartedInside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
    })
    a.addEventListener('click', (e) => {
      if (e.detail > 0 && !pointerStartedInside) {
        e.preventDefault()
        return
      }
      inchideMeniu()
    })
    a.addEventListener('keydown', (e) => {
      // Enter isi pastreaza actiunea nativa; Space asteapta eliberarea.
      if (e.key === ' ') e.preventDefault()
    })
    a.addEventListener('keyup', (e) => {
      if (e.key === ' ') {
        e.preventDefault()
        a.click()
      }
    })
  })
  // Click în afara panoului (pe fundalul overlay-ului) închide meniul.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) inchideMeniu()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && meniuBtn.getAttribute('aria-expanded') === 'true') {
      const focusable = Array.from(document.querySelectorAll('.header-actions button, #meniu-overlay a, #meniu-overlay button'))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    if (e.key === 'Escape' && meniuBtn.getAttribute('aria-expanded') === 'true') {
      inchideMeniu()
      meniuBtn.focus()
    }
  })
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  menuTransition?.dispose()
  setInert(false)
  document.body.style.overflow = overflowBeforeMenu
})

/* ——— Reveal la scroll (doar transform/opacity) ——— */
const reduceMiscare = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (reduceMiscare || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('vizibil'))
} else {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('vizibil')
          obs.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  )
  // Stagger ușor pentru lista de unelte
  document.querySelectorAll('.linii-unelte .reveal').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 60, 360)}ms`
  })
  document.querySelectorAll('.reveal').forEach((el) => obs.observe(el))
}

/* ——— Strat global neon / plutire / morph SVG: eliminate odata cu
   stratul .nb + .proiect-blob (holographic este singurul sistem decorativ;
   campurile .neon-camp raman ca ancore pentru bulele holografice). ——— */

/* ——— Sistemul vechi de bule (bule.js / slime bloburi-3d / debug coliziuni)
   ELIMINAT la curatenia holografica: singurul sistem decorativ activ este
   scena holografica (vezi blocul IntroExperience de mai jos). Implementarile
   vechi raman in backup-ul pre-legacy-removal pentru reversibilitate. */

/* ——— IntroExperience (poarta holografica) + scena holografica ———
   INTRO: intro-ul ruleaza primul (bula glass + ruptura cinematica 3.5s).
   Tot ce e greu se face in IDLE, niciodata in click:
   - la load: import modul + prepareHolographic() (fetch+decode, fara WebGL),
     apoi startHolographic({ paused: true }) = creare + UN frame de incalzire,
     amanat automat daca burst-ul ruleaza deja;
   - la click: NIMIC greu (doar ripple + uniforme) — burstul porneste instant;
   - la reveal: onRevealStart -> unpauseHolographic() (bucla continua cu
     programe deja compilate);
   - la final: onComplete -> pornesteHolographic() siguranta (idempotent).
   `?no-intro` sare peste poarta (debug / comparatii). */
let holoMod = null
import('./holographic-start.js').then((m) => {
  holoMod = m
  try {
    const r = m.prepareHolographic?.()
    const gata = r && typeof r.then === 'function' ? r : Promise.resolve()
    gata.then(() => {
      try { m.startHolographic?.({ paused: true })?.catch?.(() => {}) } catch {}
    }).catch(() => {})
  } catch {}
}).catch(() => {})
function pornesteHolographic() {
  if (holoMod && holoMod.startHolographic) holoMod.startHolographic({ paused: false })
  else {
    import('./holographic-start.js').then((m) => {
      holoMod = m
      if (m.startHolographic) m.startHolographic({ paused: false })
    }).catch(() => {})
  }
}
function laReveal() {
  try { holoMod?.unpauseHolographic?.() } catch {}
}
function heroGata() {
  try {
    if (holoMod && typeof holoMod.isHeroReady === 'function') return holoMod.isHeroReady()
    return true
  } catch { return true }
}
if (new URLSearchParams(window.location.search).has('no-intro')) {
  pornesteHolographic()
} else {
  import('./intro/intro-experience.js').then((m) => {
    if (m.initIntroExperience) {
      m.initIntroExperience({
        onComplete: pornesteHolographic,
        onRevealStart: laReveal,
        isHeroReady: heroGata,
      })
    } else {
      pornesteHolographic()
    }
  }).catch(() => pornesteHolographic())
}

/* ——— Parallax pe cursor: eliminat odata cu stratul SVG .nb (holographic
   este singurul sistem decorativ; bucla rAF nu mai are tinte). ——— */
