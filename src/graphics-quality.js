/* ——— Nivel grafic holographic: auto/high/balanced/low ———
   Preferinta explicita (localStorage 'holographic-quality', ?quality=) sau
   AUTO: porneste BALANCED (LOW pe semnale slabe: save-data, memorie/CPU
   reduse), urca la HIGH doar dupa GPU rapid sustinut, coboara la semnal
   de suprasarcina — cu histerezis, fara oscilatii. Schimbarea manuala
   fixeaza nivelul (guvernatorul DPR continua sa protejeze dedesubt).
   HIGH = aspectul integral de azi. BALANCED = acelasi design, DPR ≤ 1.5.
   LOW = DPR ≤ 1, geometrie simpla, miscare oprita (static, randat la cerere).
   Bucla paginii si evenimentele raman cele existente; modulul doar decide. */

const CHEIE = 'holographic-quality'
const NIVELE = ['low', 'balanced', 'high']
const browser = typeof window !== 'undefined'

function citesteStocata() {
  try {
    const v = browser ? localStorage.getItem(CHEIE) : null
    return NIVELE.includes(v) || v === 'auto' ? v : null
  } catch { return null }
}

let mod = citesteStocata() || 'auto'
try {
  const ceruta = browser ? new URLSearchParams(location.search).get('quality') : null
  if (ceruta && (NIVELE.includes(ceruta) || ceruta === 'auto')) {
    mod = ceruta
    try { localStorage.setItem(CHEIE, ceruta) } catch {}
  }
} catch {}

function semnalSlab() {
  try {
    if (navigator?.connection?.saveData) return 'save-data'
    const mem = navigator?.deviceMemory
    if (typeof mem === 'number' && mem <= 2) return 'memorie-redusa'
    const cpu = navigator?.hardwareConcurrency
    if (typeof cpu === 'number' && cpu <= 2) return 'cpu-redus'
  } catch {}
  return null
}

const motivInitial = semnalSlab()
let nivelAuto = motivInitial ? 'low' : 'balanced'
let motiv = mod !== 'auto'
  ? `preferinta explicita (${mod})`
  : (motivInitial ? `semnal slab (${motivInitial})` : 'implicit echilibrat')

let lentMs = 0
let rapidMs = 0
let racirePanaLa = 0
let ultimulPoll = 0
const ascultatori = new Set()

function anunta() {
  try { window.dispatchEvent(new CustomEvent('portfolio:graphics-quality')) } catch {}
  ascultatori.forEach((fn) => { try { fn() } catch {} })
}

function efectiva() {
  return mod === 'auto' ? nivelAuto : mod
}

export const graphicsQuality = {
  get mode() { return mod },
  get level() { return efectiva() },
  get auto() { return mod === 'auto' },
  motionAllowed() { return efectiva() !== 'low' },
  // Plafon tier geometrie (undefined = comportamentul existent: tier dupa
  // raza). LOW limiteaza bulele mari la tier 1 (~jumatate din triunghiuri).
  tierMaxim() { return efectiva() === 'low' ? 1 : undefined },
  dprCeiling(mobil) {
    const n = efectiva()
    if (n === 'low') return 1
    if (n === 'balanced') return mobil ? 1.25 : 1.5
    return mobil ? 1.25 : 2
  },
  setMode(nou) {
    if (nou !== 'auto' && !NIVELE.includes(nou)) return
    mod = nou
    try {
      if (nou === 'auto') localStorage.removeItem(CHEIE)
      else localStorage.setItem(CHEIE, nou)
    } catch {}
    lentMs = 0
    rapidMs = 0
    motiv = nou === 'auto' ? 'revenire la auto' : `preferinta explicita (${nou})`
    try { console.info(`[holo] calitate: ${efectiva()} (motiv: ${motiv})`) } catch {}
    anunta()
  },
  // Apelat din bucla scenei cu timpul GPU masurat (poate fi null fara
  // extensia de timer). Doar modul auto schimba nivelul, rar si cu pauze.
  poll(acum, gpuMs) {
    if (mod !== 'auto' || !Number.isFinite(gpuMs)) { ultimulPoll = acum; return }
    const pas = ultimulPoll ? Math.min(2000, Math.max(0, acum - ultimulPoll)) : 0
    ultimulPoll = acum
    if (acum < racirePanaLa) return
    if (gpuMs > 20) { lentMs += pas; rapidMs = 0 } else if (gpuMs < 8) { rapidMs += pas; lentMs = 0 }
    else { lentMs = 0; rapidMs = 0 }
    const curent = nivelAuto
    if (lentMs >= 30000 && curent !== 'low') {
      nivelAuto = NIVELE[NIVELE.indexOf(curent) - 1]
      motiv = 'GPU lent sustinut'
    } else if (rapidMs >= 60000 && curent !== 'high') {
      nivelAuto = NIVELE[NIVELE.indexOf(curent) + 1]
      motiv = 'GPU rapid sustinut'
    } else return
    lentMs = 0
    rapidMs = 0
    racirePanaLa = acum + (nivelAuto < curent ? 30000 : 60000)
    try { console.info(`[holo] calitate: ${nivelAuto} (motiv: ${motiv})`) } catch {}
    anunta()
  },
  onChange(fn) {
    ascultatori.add(fn)
    return () => ascultatori.delete(fn)
  },
  info() {
    return { mode: mod, level: efectiva(), reason: motiv }
  },
}

try { console.info(`[holo] calitate: ${efectiva()} (motiv: ${motiv})`) } catch {}
