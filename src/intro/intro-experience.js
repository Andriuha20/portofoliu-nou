import * as THREE from 'three'
import { createStudioEnvironment } from './codex/studio.js'
import { createBubbleGeometryCache } from './codex/geometry.js'
import { createBubbleProfile, fitSculpture, sampleBubbleMotion } from './codex/individuality.js'
import { createIntroBubbleMaterial } from './intro-material.js'
import { createRuptureDebris } from './intro-fragments.js'
import { buildIntroOverlay, lockPage, unlockPage } from './intro-overlay.js'
import './intro.css'

/* ——— IntroExperience: bula GLASS Codex (bean) + ruptură ———
   Același sistem ca portofoliul: geometrie organică `bean`, profil de sculpt
   + mișcare Codex, material thin-film glass, mediu studio PMREM, fără tone
   mapping. Diferențe intro: dimensiune centrală, injecție de ruptură (fade/
   discard proprii), timeline de burst, reveal radial.
   Interfață: initIntroExperience({ onComplete, preload }). */

export const IntroTimeline = {
  atingere: 0.15, // faza 1: reactie + comprimare elastica la click (0–0.15s)
  ruptura: 1.3, // faza 3: membrana crapa/rupta complet (0.15→1.30s)
  resturiDeLa: 0.45, // faza 2/3: unda de energie + cioburile pornesc (0.15–0.45s)
  revealDeLa: 1.3, // faza 4: gaura se extinde, Hero prin portal (1.30–3.50s)
  sfarsit: 3.5, // total ≈ 3.5s cinematic (suprapunere ruptura/reveal)
}

export function easeOutCubic(x) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)
}
export function easeInCubic(x) {
  const k = Math.min(1, Math.max(0, x))
  return k * k * k
}
/** Compresia tactilă din faza A (0 la capete, maximă la mijloc). */
export function touchSquash(t) {
  const k = Math.min(1, Math.max(0, t / IntroTimeline.atingere))
  return 1 - 0.09 * Math.sin(Math.PI * k)
}

function temaCurenta() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 1 : 0
}

export function initIntroExperience({ mount, onComplete, preload, onBurstStart, isHeroReady, onRevealStart } = {}) {
  const gazda = mount || document.body
  const laFinal = typeof onComplete === 'function' ? onComplete : () => {}
  // Semnal readiness Hero (primul frame randat). Default: adevarat (pentru
  // pagini fara scena 3D in spate — nu blocheaza niciodata reveal-ul).
  const heroGata = typeof isHeroReady === 'function' ? isHeroReady : () => true
  // Miscare redusa: implicit se respecta sistemul (accesibilitate), dar
  // utilizatorul poate forta explicit „Animatie completa” (salvat in
  // localStorage). Efectiv: stored 'completa' → miscare completa chiar si cu
  // sistem redus; stored 'redusa' → rapid; altfel → setarea sistemului.
  const CHEIE_ANIMATIE = 'intro-animatie'
  const mediaMiscare = window.matchMedia('(prefers-reduced-motion: reduce)')
  const sistemRedus = () => {
    try { return mediaMiscare.matches } catch (e) { return false }
  }
  let preferintaAnimatie = null
  try { preferintaAnimatie = localStorage.getItem(CHEIE_ANIMATIE) } catch (e) { preferintaAnimatie = null }
  if (preferintaAnimatie !== 'completa' && preferintaAnimatie !== 'redusa') preferintaAnimatie = null
  let reduceMiscare = preferintaAnimatie === 'completa' ? false : preferintaAnimatie === 'redusa' ? true : sistemRedus()
  function motivMiscare() {
    if (preferintaAnimatie === 'completa') return 'preferinta explicita (completa)'
    if (preferintaAnimatie === 'redusa') return 'preferinta explicita (redusa)'
    return `sistem (reduced=${sistemRedus()})`
  }
  let opresteAscultareMedia = () => {}
  const esteMobil = window.matchMedia('(max-width: 767px)').matches
  const cursorFin = window.matchMedia('(pointer: fine)').matches

  const { root, canvas, cta, optiune } = buildIntroOverlay()
  gazda.appendChild(root)
  lockPage(cta)
  // Marker de build + faza initiala + mod miscare (diagnostic / teste).
  try {
    root.dataset.introBuild = 'cine-glass-break-3.5s-r9'
    root.dataset.introFaza = 'idle'
    root.dataset.introMiscare = reduceMiscare ? 'redusa' : 'completa'
    console.info('[intro] build=cine-glass-break-3.5s-r9 timeline=3.5s')
    console.info(`[intro] miscare: ${reduceMiscare ? 'redusa' : 'completa'} (motiv: ${motivMiscare()})`)
  } catch (e) {}

  // Comutatorul „Animatie completa”: vizibil cand sistemul prefera miscare
  // redusa sau exista o preferinta salvata. Schimba modul LIVE (bucla
  // citeste `reduceMiscare` la fiecare cadru), fara remontare.
  function actualizeazaOptiune() {
    if (!optiune) return
    try {
      const arata = sistemRedus() || preferintaAnimatie !== null
      optiune.hidden = !arata
      const activa = preferintaAnimatie === 'completa'
      optiune.textContent = activa ? 'ANIMAȚIE COMPLETĂ: ACTIVATĂ (DEZACTIVEAZĂ)' : 'ANIMAȚIE COMPLETĂ'
      optiune.setAttribute('aria-pressed', activa ? 'true' : 'false')
      optiune.setAttribute('aria-label', 'Activează animația completă de 1,35 secunde chiar dacă sistemul preferă mișcare redusă')
    } catch (e) {}
  }
  if (optiune) optiune.addEventListener('click', () => {
    if (stare !== 'idle') return
    if (preferintaAnimatie === 'completa') {
      preferintaAnimatie = null
      try { localStorage.removeItem(CHEIE_ANIMATIE) } catch (e) {}
    } else {
      preferintaAnimatie = 'completa'
      try { localStorage.setItem(CHEIE_ANIMATIE, 'completa') } catch (e) {}
    }
    reduceMiscare = preferintaAnimatie === 'completa' ? false : preferintaAnimatie === 'redusa' ? true : sistemRedus()
    try { root.dataset.introMiscare = reduceMiscare ? 'redusa' : 'completa' } catch (e) {}
    console.info(`[intro] miscare: ${reduceMiscare ? 'redusa' : 'completa'} (motiv: ${motivMiscare()})`)
    actualizeazaOptiune()
  })
  try {
    const laSchimbareMedia = () => {
      if (preferintaAnimatie !== null) return
      reduceMiscare = sistemRedus()
      try { root.dataset.introMiscare = reduceMiscare ? 'redusa' : 'completa' } catch (e) {}
      console.info(`[intro] miscare: ${reduceMiscare ? 'redusa' : 'completa'} (motiv: sistem live, reduced=${sistemRedus()})`)
      actualizeazaOptiune()
    }
    if (typeof mediaMiscare.addEventListener === 'function') {
      mediaMiscare.addEventListener('change', laSchimbareMedia)
      opresteAscultareMedia = () => mediaMiscare.removeEventListener('change', laSchimbareMedia)
    } else if (typeof mediaMiscare.addListener === 'function') {
      mediaMiscare.addListener(laSchimbareMedia)
      opresteAscultareMedia = () => mediaMiscare.removeListener(laSchimbareMedia)
    }
  } catch (e) {}
  actualizeazaOptiune()

  let incheiat = false
  const incheie = () => {
    if (incheiat) return
    incheiat = true
    console.info('[INTRO] overlay removed')
    try { console.trace('[INTRO] overlay removed trace') } catch (e) {}
    try {
      cancelAnimationFrame(raf)
    } catch (e) {}
    window.removeEventListener('resize', laRedimensionare)
    document.removeEventListener('visibilitychange', laVizibilitate)
    try { opresteAscultareMedia() } catch (e) {}
    try {
      observatorTema.disconnect()
    } catch (e) {}
    try {
      curata()
    } catch (e) {}
    if (root.parentElement) root.parentElement.removeChild(root)
    unlockPage()
    laFinal()
  }

  // Rezerva DOM (fara WebGL): tranzitie vizibila ~2.3s — unda din halou +
  // stingere overlay — apoi incheiere normala. Aceeasi ordine de loguri ca
  // varianta WebGL, ca verificarile sa functioneze identic.
  function ruleazaFallback(motiv) {
    console.info(`[INTRO] fallback DOM activ: ${motiv}`)
    let fazaFb = 'idle'
    try { root.dataset.introFaza = fazaFb } catch (e) {}
    let terminat = false
    const termina = () => {
      if (terminat) return
      terminat = true
      fazaFb = 'complete'
      try { root.dataset.introFaza = fazaFb } catch (e) {}
      console.info('[INTRO] reveal finished t=fallback')
      incheie()
    }
    const laClick = (ev) => {
      if (fazaFb !== 'idle') return true
      console.info('[INTRO] click detected reduced=false stare=idle')
      if (reduceMiscare) {
        window.setTimeout(termina, 200)
        return true
      }
      fazaFb = 'compress'
      try { root.dataset.introFaza = fazaFb } catch (e) {}
      console.info('[INTRO] compress started t0=fallback')
      root.classList.add('intro-iese', 'intro-fallback')
      // Unda luminoasa DOM din punctul atins (transform+opacity = compozitat).
      try {
        const px = ev && typeof ev.clientX === 'number' ? ev.clientX : window.innerWidth / 2
        const py = ev && typeof ev.clientY === 'number' ? ev.clientY : window.innerHeight / 2
        const unda = document.createElement('div')
        unda.className = 'intro-undă-fallback'
        unda.setAttribute('aria-hidden', 'true')
        unda.style.left = `${Math.round(px)}px`
        unda.style.top = `${Math.round(py)}px`
        root.appendChild(unda)
      } catch (e) {}
      window.setTimeout(() => {
        if (fazaFb !== 'compress') return
        fazaFb = 'reveal'
        try { root.dataset.introFaza = fazaFb } catch (e) {}
        console.info('[INTRO] compress finished t=1.10')
        console.info('[INTRO] reveal started')
        console.info('[INTRO] reveal progress r=fallback')
      }, 1100)
      window.setTimeout(termina, 2300)
      return true
    }
    canvas.addEventListener('pointerdown', laClick)
    cta.addEventListener('click', laClick)
    return { activate: () => laClick(), dispose: () => incheie(), get done() { return terminat } }
  }

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  } catch (e) {
    return ruleazaFallback('creare renderer esuata')
  }
  if (!renderer.getContext()) {
    return ruleazaFallback('context WebGL indisponibil')
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, esteMobil ? 1.5 : 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping

  const scena = new THREE.Scene()
  // Cameră ortografică în px; în afara sferei (fix camera-în-sferă).
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10000)
  camera.position.set(0, 0, 5000)

  // Mediul studio Codex (panouri HDR coapte o singură dată).
  const environment = createStudioEnvironment()
  environment.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), esteMobil ? 2 : 4)

  // Geometrie organică bean + profil sculpt Codex (ca în portofoliu).
  const R = Math.max(104, Math.min(188, window.innerWidth * 0.36, window.innerHeight * 0.26))
  root.style.setProperty('--intro-r', `${Math.round(R)}px`)
  // Geometrie ROTUNDA Codex (presetul `sphere`: sfera perfecta teselata neted,
  // fara lobi) + profil `simple` (deformare sub 4%, doar respiratie fina).
  const cacheGeometrii = createBubbleGeometryCache(esteMobil)
  const geoBula = cacheGeometrii.get('sphere', R)
  const profil = createBubbleProfile('intro-sphere', 'simple', 'sphere')
  const potrivire = fitSculpture(geoBula, profil)

  const grup = new THREE.Group()
  scena.add(grup)
  const { material: materialBula, uniforms } = createIntroBubbleMaterial(environment)
  const bula = new THREE.Mesh(geoBula, materialBula)
  bula.scale.setScalar(R)
  bula.frustumCulled = false
  bula.renderOrder = 1
  grup.add(bula)

  // Uniforme statice (oglindesc onBeforeRender din scene.js Codex).
  const cadruSculpt = new THREE.Matrix3().fromArray(profil.frame)
  const unde = profil.waves.map((w) => new THREE.Vector4().fromArray(w))
  const rotireMediu = new THREE.Matrix3().setFromMatrix4(
    new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.2, 0.5, -0.15)),
  )
  const marimeRata = 0.5 + 0.58 / (1 + R / 160)
  const rateUnda = new THREE.Vector3().fromArray(profil.motion.waveRates).multiplyScalar(marimeRata)
  const respiratie = new THREE.Vector3().fromArray(profil.motion.breath)
  respiratie.x *= marimeRata
  respiratie.z *= 0.5 + 0.5 / (1 + R / 180)
  const castigDeform = profil.motion.deformationGain * (0.48 + 0.52 / (1 + R / 180)) * 1.4
  const optica = new THREE.Vector3(6.5, 0.95, 3.1)
  const poza = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, rate: 1 }

  function scrieUniforme(timp, hover) {
    uniforms.uTime.value = timp
    uniforms.uPhase.value = 1.3
    uniforms.uMotion.value = reduceMiscare ? 0 : 1
    uniforms.uHover.value = hover
    uniforms.uOffsetScale.value = geoBula.userData.offsetScale || 1
    uniforms.uDark.value = temaCurenta()
    uniforms.uDepth.value = 0
    uniforms.uEnvironmentRotation.value.copy(rotireMediu)
    uniforms.uOptics.value.copy(optica)
    uniforms.uWave1.value.copy(unde[0])
    uniforms.uWave2.value.copy(unde[1])
    uniforms.uWave3.value.copy(unde[2])
    uniforms.uWaveRates.value.copy(rateUnda)
    uniforms.uDeformGain.value = castigDeform
    uniforms.uSculptFrame.value.copy(cadruSculpt)
    uniforms.uSculptA.value.fromArray(profil.sculptA)
    uniforms.uSculptB.value.fromArray(profil.sculptB)
    uniforms.uSculptCenter.value.fromArray(potrivire.center)
    uniforms.uSculptScale.value = potrivire.scale
    uniforms.uBreath.value.copy(respiratie)
  }
  scrieUniforme(0, 0)

  const observatorTema = new MutationObserver(() => {
    uniforms.uDark.value = temaCurenta()
    if (resturi) resturi.setDark(temaCurenta())
  })
  observatorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  function laRedimensionare() {
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    camera.left = -window.innerWidth / 2
    camera.right = window.innerWidth / 2
    camera.top = window.innerHeight / 2
    camera.bottom = -window.innerHeight / 2
    camera.updateProjectionMatrix()
  }
  laRedimensionare()
  window.addEventListener('resize', laRedimensionare)

  let preloadPornit = false
  const pornestePreload = () => {
    if (preloadPornit || typeof preload !== 'function') return
    preloadPornit = true
    try {
      const r = preload()
      if (r && typeof r.catch === 'function') r.catch(() => {})
    } catch (e) {}
  }
  const programPreload = () => {
    if (window.requestIdleCallback) window.requestIdleCallback(pornestePreload, { timeout: 1200 })
    else window.setTimeout(pornestePreload, 400)
  }
  programPreload()

  // Ceas intro (×6) + amplitudini proprii: aceleasi forme de unda Codex,
  // dar cu perioade de 4–8s ca miscarea sa se vada in 3–5s.
  const CEAS_MOTION = 6
  const AMP_X = 0.7 // ±3.5–5.6px (6–10px peak-to-peak, cerinta)
  const AMP_Y = 1.2 // ±9–14px (~18–25px peak-to-peak, cerinta)
  const SPIN_Y = 0.35 // rotatie lenta continua (turatie completa ~18s)
  // Arc cursor: deplasare mica spre cursor, elastic amortizat.
  let arcX = 0
  let arcY = 0
  let tintaArcX = 0
  let tintaArcY = 0

  const raycaster = new THREE.Raycaster()
  const cursorNdc = new THREE.Vector2()
  let cursorMutat = false
  let cursorPeBula = false
  let hoverVal = 0
  let tintaInclinareX = 0
  let tintaInclinareY = 0

  if (cursorFin) {
    canvas.addEventListener('pointermove', (e) => {
      cursorNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
      cursorMutat = true
      tintaInclinareX = e.clientX / window.innerWidth - 0.5
      tintaInclinareY = e.clientY / window.innerHeight - 0.5
      // Tinta arcului: max ±10px spre cursor, niciodata departe de centru.
      tintaArcX = Math.max(-10, Math.min(10, (e.clientX / window.innerWidth - 0.5) * 20))
      tintaArcY = Math.max(-10, Math.min(10, (e.clientY / window.innerHeight - 0.5) * 20))
    }, { passive: true })
    canvas.addEventListener('pointerleave', () => {
      cursorPeBula = false
      tintaInclinareX = 0
      tintaInclinareY = 0
      tintaArcX = 0
      tintaArcY = 0
    })
  }

  // Masina unica de stari a tranzitiei: idle → compress → reveal → complete.
  // `compress` acopera atingerea + ruptura membranei (0 → ruptura),
  // `reveal` acopera cioburile + gaura radiala (ruptura → sfarsit),
  // `complete` inseamna STRICT sfarsitul timeline-ului. Faza curenta este
  // expusa in DOM (data-intro-faza / data-intro-t) pentru debug si teste.
  let stare = 'idle' // idle | compress | reveal | complete
  function fazaDinTimp(t) {
    const T = IntroTimeline
    if (t < T.ruptura) return 'compress'
    if (t < T.sfarsit) return 'reveal'
    return 'complete'
  }
  let t0 = 0
  let pereteStart = 0
  let timpScena = 0
  let spinY = 0 // spin lent continuu (reflexii in miscare pe sfera rotunda)
  let resturi = null
  let revealPornit = false
  let ultimaLogReveal = -1
  let revealAsteptat = false
  let revealVizibil = false
  let cadreFinal = 0
  let compressGata = false
  let revealX = window.innerWidth / 2
  let revealY = window.innerHeight / 2
  let plutireInghetata = { x: 0, y: 0 }
  let inelRipple = null
  const quatInv = new THREE.Quaternion()

  function directieLocala(directieLume) {
    bula.getWorldQuaternion(quatInv).invert()
    return directieLume.clone().applyQuaternion(quatInv).normalize()
  }

  // Unda luminoasa cu margini moi (nu disc plat): banda Gaussiana pe
  // raza + filament central, aditiv — vizibila la orice raza, de la
  // 0.15R pana la marginea ecranului.
  function creeazaMaterialRipple() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xcdeeff) },
        uOpacity: { value: 0.85 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          float d = length(vUv - vec2(0.5)) * 2.0;
          float glow = smoothstep(0.66, 0.95, d) * (1.0 - smoothstep(0.95, 1.0, d));
          float muchie = exp(-pow((d - 0.95) / 0.022, 2.0));
          float a = (glow * 0.55 + muchie * 0.65) * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }

  // Pre-incalzire program GPU ripple: prima compilare la click ar ingheta
  // cadrul de impact. Mesh-ul ramane in scena (punct subpixel, invizibil)
  // cu programul compilat si este REFOLOSIT la click: zero alocari si zero
  // compilari in tranzitie. NU se face dispose aici (ar sterge programul).
  let ripplePreincalzit = null
  try {
    const matPre = creeazaMaterialRipple()
    const meshPre = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matPre)
    meshPre.position.set(0, 0, -4900)
    meshPre.scale.setScalar(0.01)
    meshPre.frustumCulled = false
    meshPre.renderOrder = 5
    scena.add(meshPre)
    renderer.compile(scena, camera)
    meshPre.visible = false
    ripplePreincalzit = meshPre
  } catch (e) { ripplePreincalzit = null }

  function activate(clientX, clientY) {
    if (stare !== 'idle') return false
    // Ordine critica: t0 si `stare` se seteaza la FINAL, dupa ce totul a
    // reusit. Altfel o exceptie lasa o stare intermediara cu t0=0, iar cadrul
    // urmator sare direct la final (overlay eliminat, zero animatie).
    try {
    console.info(`[INTRO] click detected reduced=${reduceMiscare} stare=${stare}`)
    pornestePreload()
    plutireInghetata = { x: grup.position.x, y: grup.position.y }

    let dirLume
    let lovit = null
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      revealX = clientX
      revealY = clientY
      cursorNdc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1)
      raycaster.setFromCamera(cursorNdc, camera)
      lovit = raycaster.intersectObject(bula, false)[0] || null
      dirLume = lovit
        ? lovit.point.clone().sub(grup.position).normalize()
        : new THREE.Vector3(clientX < window.innerWidth / 2 ? -0.3 : 0.3, 0.25, 1).normalize()
    } else {
      dirLume = new THREE.Vector3(0.22, 0.3, 1).normalize()
    }
    uniforms.uHitDir.value.copy(directieLocala(dirLume))
    grup.userData.dirLume = dirLume
    // Inel ripple la punctul de contact: semnal de "apasat" imposibil de ratat.
    // Preferam mesh-ul pre-incalzit (program deja compilat, zero jank).
    try {
      if (inelRipple) {
        scena.remove(inelRipple)
        inelRipple.geometry.dispose()
        inelRipple.material.dispose()
        inelRipple = null
      }
      const punct = lovit && lovit.point
        ? lovit.point.clone()
        : grup.position.clone().add(new THREE.Vector3(0.2 * R, 0.25 * R, 0.9 * R))
      if (ripplePreincalzit) {
        inelRipple = ripplePreincalzit
        ripplePreincalzit = null
        inelRipple.material.uniforms.uOpacity.value = 0.85
      } else {
        const geoInel = new THREE.PlaneGeometry(2, 2)
        const matInel = creeazaMaterialRipple()
        inelRipple = new THREE.Mesh(geoInel, matInel)
        inelRipple.renderOrder = 5
        inelRipple.frustumCulled = false
      }
      inelRipple.position.copy(punct).add(new THREE.Vector3(0, 0, 6))
      inelRipple.visible = true
      if (!inelRipple.parent) scena.add(inelRipple)
    } catch (e) {}
    root.classList.add('intro-iese')
    t0 = performance.now()
    try { pereteStart = t0 } catch (e) {}
    stare = 'compress'
    try { root.dataset.introFaza = stare } catch (e) {}
    console.info(`[INTRO] compress started t0=${Math.round(t0)}`)
    // Semnal catre pagina: incepe pregatirea/pornirea scenei Hero IMEDIAT
    // (burst vizibil oricum), fara sa astepte onComplete. Non-blocant.
    try {
      if (typeof onBurstStart === 'function') {
        const r = onBurstStart()
        if (r && typeof r.catch === 'function') r.catch(() => {})
      }
    } catch (e) {}
    return true
    } catch (err) {
      try { console.error('[INTRO] activate esuat', err) } catch (e) {}
      return false
    }
  }

  canvas.addEventListener('pointerdown', (e) => activate(e.clientX, e.clientY))
  cta.addEventListener('click', () => activate())

  function curata() {
    if (resturi) resturi.dispose()
    if (inelRipple) {
      try {
        scena.remove(inelRipple)
        inelRipple.geometry.dispose()
        inelRipple.material.dispose()
      } catch (e) {}
      inelRipple = null
    }
    if (ripplePreincalzit) {
      try {
        scena.remove(ripplePreincalzit)
        ripplePreincalzit.geometry.dispose()
        ripplePreincalzit.material.dispose()
      } catch (e) {}
      ripplePreincalzit = null
    }
    cacheGeometrii.dispose()
    materialBula.dispose()
    try {
      environment.dispose()
    } catch (e) {}
    renderer.dispose()
    if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss()
  }

  let ultimaAfisare = performance.now()
  let vizibil = true
  function laVizibilitate() {
    vizibil = document.visibilityState === 'visible'
    ultimaAfisare = performance.now()
    if (vizibil) requestAnimationFrame(bucla)
  }
  document.addEventListener('visibilitychange', laVizibilitate)

  const inceput = performance.now()
  let raf = 0
  let timpStatic = false

  function bucla(acum) {
    if (incheiat) return
    if (!vizibil) return
    raf = requestAnimationFrame(bucla)
    const dt = Math.min(0.05, Math.max(0.0001, (acum - ultimaAfisare) / 1000))
    ultimaAfisare = acum
    const deLaMontare = (acum - inceput) / 1000

    if (stare === 'idle') {
      if (!reduceMiscare) timpScena += dt
      if (!reduceMiscare) sampleBubbleMotion(profil, timpScena * CEAS_MOTION, R, poza)
      else poza.x = poza.y = poza.rx = poza.ry = poza.rz = 0
      if (!reduceMiscare) spinY += dt * SPIN_Y
      // Arc elastic spre cursor (critically damped-ish, fara sarituri).
      arcX += (tintaArcX - arcX) * 0.06
      arcY += (tintaArcY - arcY) * 0.06
      grup.position.x = poza.x * AMP_X + arcX
      grup.position.y = poza.y * AMP_Y + arcY
      bula.rotation.set(0.1 + poza.rx, -0.15 + spinY + poza.ry, poza.rz)
      if (!reduceMiscare && cursorFin) {
        grup.rotation.x += (tintaInclinareY * 0.14 - grup.rotation.x) * 0.05
        grup.rotation.y += (tintaInclinareX * 0.2 - grup.rotation.y) * 0.05
      }
      if (cursorMutat && !reduceMiscare) {
        cursorMutat = false
        raycaster.setFromCamera(cursorNdc, camera)
        cursorPeBula = raycaster.intersectObject(bula, false).length > 0
        canvas.classList.toggle('intro-poate-apăsa', cursorPeBula)
      }
      const tintaHover = cursorPeBula ? 1 : 0
      hoverVal += (tintaHover - hoverVal) * 0.12
      const respiratieJs = reduceMiscare ? 1 : 1 + Math.sin(timpScena * 0.9) * 0.022
      const tintaScală = (cursorPeBula ? 1.045 : 1) * (0.85 + 0.15 * easeOutCubic(deLaMontare / 0.45)) * respiratieJs
      grup.scale.setScalar(grup.scale.x + (tintaScală - grup.scale.x) * 0.12)
      scrieUniforme(timpScena, hoverVal)
    } else if (stare !== 'idle' && stare !== 'complete') {
      const t = (acum - t0) / 1000
      const T = IntroTimeline
      stare = fazaDinTimp(t)
      if (!compressGata && t >= T.ruptura) {
        compressGata = true
        console.info(`[INTRO] compress finished t=${t.toFixed(2)}`)
      }
      try {
        if (root.dataset.introFaza !== stare) root.dataset.introFaza = stare
        const tR = t.toFixed(2)
        if (root.dataset.introT !== tR) root.dataset.introT = tR
      } catch (e) {}
      if (!reduceMiscare) timpScena += dt
      grup.position.x = plutireInghetata.x
      grup.position.y = plutireInghetata.y
      uniforms.uDent.value = easeOutCubic(t / T.atingere)
      // Unda de energie pe membrana (faza 2): front vizibil ~0.05→0.40s.
      uniforms.uWave.value = t < 0.05 ? 0 : easeOutCubic((t - 0.05) / 0.35)
      uniforms.uTime.value = timpScena
      uniforms.uRupture.value = t < T.atingere ? 0 : easeInCubic((t - T.atingere) / (T.ruptura - T.atingere))
      // Membrana se umfla fluid pe masura ce plesneste (expansiune lichida,
      // nu disparitie prin scalare): squash-ul tactil revine la 1, apoi
      // bula creste usor pana la discardul complet.
      const umflare = 1 + 0.1 * easeOutCubic(uniforms.uRupture.value)
      grup.scale.setScalar(touchSquash(t) * (cursorPeBula ? 1.045 : 1) * umflare)
      if (t > T.ruptura) bula.visible = false
      if (!resturi && t >= T.resturiDeLa) {
        const dirLume = grup.userData.dirLume || new THREE.Vector3(0.22, 0.3, 1).normalize()
        resturi = createRuptureDebris({
          center: grup.position.clone(),
          radius: R * grup.scale.x,
          hitDir: dirLume,
          environment,
          dark: temaCurenta(),
        })
        resturi.setDark(temaCurenta())
        scena.add(resturi.group)
      }
      if (resturi) resturi.update(dt, timpScena)
      // Gaura radiala care deschide portofoliul din punctul atins: masca
      // (nu clip-path — cercul clip ar reaparea overlay-ul pe masura ce
      // creste). Transparent in interior, overlay vizibil in exterior;
      // cioburile din afara gaurii raman vizibile pana la final.
      let razaGaura = 0
      let kReveal = 0
      if (!revealPornit && t >= T.revealDeLa) {
        if (heroGata()) {
          revealPornit = true
          console.info('[INTRO] reveal started')
          // Semnal catre pagina: porneste bucla scenei Hero (deja compilata
          // in idle). Non-blocant, o singura data.
          try {
            if (typeof onRevealStart === 'function') {
              const r = onRevealStart()
              if (r && typeof r.catch === 'function') r.catch(() => {})
            }
          } catch (e) {}
        } else {
          // Gaura asteapta scena Hero (altfel s-ar deschide spre gol).
          // Dupa 8s de asteptare se forteaza (fara blocare permanenta).
          if (!revealAsteptat) {
            revealAsteptat = true
            console.warn('[INTRO] astept hero-ready (gaura inchisa)')
          }
          try {
            if (performance.now() - (pereteStart + T.revealDeLa * 1000) > 8000) {
              revealPornit = true
              console.error('[INTRO] hero timeout 8s: reveal fortat')
            }
          } catch (e) {}
        }
      }
      if (revealPornit) {
        kReveal = easeOutCubic((t - T.revealDeLa) / Math.max(0.05, T.sfarsit - T.revealDeLa))
        const razaMax = Math.hypot(
          Math.max(revealX, window.innerWidth - revealX),
          Math.max(revealY, window.innerHeight - revealY),
        )
        razaGaura = Math.max(0, kReveal * razaMax)
        const masca = `radial-gradient(circle ${razaGaura.toFixed(1)}px at ${revealX.toFixed(0)}px ${revealY.toFixed(0)}px, transparent ${(razaGaura).toFixed(1)}px, black ${(razaGaura + 1).toFixed(1)}px)`
        root.style.setProperty('mask-image', masca)
        root.style.setProperty('-webkit-mask-image', masca)
        if (kReveal > 0.9) revealVizibil = true
        if (t - ultimaLogReveal > 0.2) {
          ultimaLogReveal = t
          console.info(`[INTRO] reveal progress r=${Math.round(razaGaura)}px`)
        }
      }
      // Inelul ripple: unda de energie (0–1.10s, 0.15R→1.7R, marcheaza zona
      // de rupere), apoi tine 1.7R pana la reveal si calareste marginea
      // gaurii pana la final — unda luminoasa ESTE marginea portalului.
      if (inelRipple) {
        const impactPanaLa = T.resturiDeLa
        if (t < impactPanaLa) {
          const kr = Math.min(1, t / impactPanaLa)
          inelRipple.scale.setScalar(Math.max(0.001, R * (0.15 + 1.55 * easeOutCubic(kr))))
          inelRipple.material.uniforms.uOpacity.value = 0.85 - 0.45 * kr
          inelRipple.visible = true
        } else {
          const scAsteptare = R * 1.7 * (1 - kReveal)
          inelRipple.scale.setScalar(Math.max(0.001, Math.max(razaGaura, scAsteptare)))
          inelRipple.material.uniforms.uOpacity.value = 0.4 * (1 - kReveal)
          inelRipple.visible = kReveal < 1
        }
      }
      if (reduceMiscare && !timpStatic) {
        timpStatic = true
        console.info('[INTRO] cale redusa: final rapid, fara reveal (preferinta sistem/accesibilitate)')
        root.style.transition = 'opacity 150ms ease'
        root.style.opacity = '0'
        window.setTimeout(() => incheie(), 170)
        return
      }
      if (t >= T.sfarsit) {
        // REGULA DURA: overlay-ul se elimina DOAR dupa reveal vizibil.
        // Daca ceasul a alergat inaintea cadrelor (jank sever), timeline-ul
        // ramane la final si randarea continua pana gaura e afisata efectiv.
        // Plase de siguranta: 240 cadre sau 9s de perete (fara blocare).
        const pereteScurs = (() => { try { return performance.now() - pereteStart } catch (e) { return 0 } })()
        if (!reduceMiscare && !revealVizibil && cadreFinal < 240 && pereteScurs < 9000) {
          cadreFinal += 1
          if (cadreFinal === 1) console.warn('[INTRO] final amanat: astept reveal vizibil')
        } else {
          if (cadreFinal > 0 && !revealVizibil) console.error('[INTRO] final fortat fara reveal vizibil')
          stare = 'complete'
          try { root.dataset.introFaza = stare } catch (e) {}
          console.info(`[INTRO] reveal finished t=${t.toFixed(2)}`)
          incheie()
          return
        }
      }
    }

    renderer.render(scena, camera)
  }

  if (reduceMiscare) {
    renderer.render(scena, camera)
  }
  raf = requestAnimationFrame((t) => {
    ultimaAfisare = t
    bucla(t)
  })

  return {
    activate,
    dispose: () => incheie(),
    get done() { return incheiat },
  }
}
