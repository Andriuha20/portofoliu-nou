/* Blob 2D Lab — 3 variante izolate pe aceeași pagină: A (SVG), B (Canvas2D),
   C (hibrid: textură canvas + luciu vectorial). Nicio legătură cu portofoliul. */

import { FORME, pathNeted, razaLa } from './shapes.js'
import { picteazaCorp, daraContur, rimContur, descarcaPNG, punctContur } from './paint.js'

const SCARA_CANVAS = 640
const AFISAT_PX = 320

function drumPrinPuncte(pts) {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i += 2) {
    const p1 = pts[i]
    const p2 = pts[i + 1] || pts[pts.length - 1]
    d += ` Q ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

function arcPuncte(forma, g0, g1, inset, pasi = 20) {
  const pts = []
  for (let i = 0; i <= pasi; i++) {
    pts.push(punctContur(forma, g0 + ((g1 - g0) * i) / pasi, inset))
  }
  return pts
}

/* ——— Varianta A: SVG pur (straturi + măști + blur selectiv) ——— */
function construiesteA(forma, id) {
  const d = pathNeted(forma)
  const dara1 = drumPrinPuncte(arcPuncte(forma, 292, 348, 26))
  const dara2 = drumPrinPuncte(arcPuncte(forma, 28, 62, 30))
  const rimCyan = drumPrinPuncte(arcPuncte(forma, 195, 262, 7, 30))
  const rimMag = drumPrinPuncte(arcPuncte(forma, 18, 92, 7, 30))
  const pete = [
    [150, 150, 95, 70, '#00EFFF', 0.55],
    [258, 132, 80, 62, '#742BEB', 0.6],
    [120, 262, 88, 66, '#FF36E8', 0.42],
    [262, 268, 76, 58, '#145BFF', 0.55],
    [205, 205, 66, 50, '#F6F8FF', 0.5],
    [180, 300, 60, 44, '#3B0C91', 0.5],
  ]
  const peteSvg = pete
    .map(([x, y, rx, ry, c, o]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${o}" transform="rotate(${(x * 13 + y) % 40 - 20} ${x} ${y})"/>`)
    .join('')
  return `
  <svg class="b2d-svg" viewBox="0 0 400 400" role="img" aria-label="Varianta A — blob SVG">
    <defs>
      <linearGradient id="${id}-corp" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0A1E9E"/><stop offset="0.38" stop-color="#145BFF"/>
        <stop offset="0.72" stop-color="#4B2BD8"/><stop offset="1" stop-color="#842BFF"/>
      </linearGradient>
      <radialGradient id="${id}-umbra" cx="0.68" cy="0.74" r="0.62">
        <stop offset="0" stop-color="#0B0620" stop-opacity="0.62"/><stop offset="0.65" stop-color="#0B0620" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id}-lumina" cx="0.34" cy="0.28" r="0.55">
        <stop offset="0" stop-color="#DFFBFF" stop-opacity="0.5"/><stop offset="0.7" stop-color="#DFFBFF" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-dara" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.95"/>
        <stop offset="0.62" stop-color="#E8FDFF" stop-opacity="0.9"/><stop offset="0.85" stop-color="#8FFCFF" stop-opacity="0.4"/>
        <stop offset="1" stop-color="#8FFCFF" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${id}-rimc" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#00EFFF" stop-opacity="0.1"/><stop offset="0.55" stop-color="#00EFFF" stop-opacity="0.95"/><stop offset="1" stop-color="#8FFCFF" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="${id}-rimm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FF7AEF" stop-opacity="0.9"/><stop offset="0.55" stop-color="#FF36E8" stop-opacity="0.95"/><stop offset="1" stop-color="#FF36E8" stop-opacity="0.1"/>
      </linearGradient>
      <filter id="${id}-moale" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id="${id}-stralucire" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="24"/></filter>
      <clipPath id="${id}-taietura"><path d="${d}"/></clipPath>
    </defs>
    <path d="${d}" fill="#2B6BFF" opacity="0.35" filter="url(#${id}-stralucire)"/>
    <path d="${d}" fill="url(#${id}-corp)"/>
    <g clip-path="url(#${id}-taietura)" filter="url(#${id}-moale)">${peteSvg}</g>
    <path d="${d}" fill="url(#${id}-umbra)"/>
    <path d="${d}" fill="url(#${id}-lumina)"/>
    <path d="${rimCyan}" fill="none" stroke="url(#${id}-rimc)" stroke-width="11" stroke-linecap="round" opacity="0.35" filter="url(#${id}-moale)"/>
    <path d="${rimMag}" fill="none" stroke="url(#${id}-rimm)" stroke-width="11" stroke-linecap="round" opacity="0.35" filter="url(#${id}-moale)"/>
    <path d="${rimCyan}" fill="none" stroke="url(#${id}-rimc)" stroke-width="4.5" stroke-linecap="round" opacity="0.95"/>
    <path d="${rimMag}" fill="none" stroke="url(#${id}-rimm)" stroke-width="4.5" stroke-linecap="round" opacity="0.95"/>
    <path d="${dara1}" fill="none" stroke="url(#${id}-dara)" stroke-width="13" stroke-linecap="round" opacity="0.9"/>
    <path d="${dara2}" fill="none" stroke="url(#${id}-dara)" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
  </svg>`
}

/* ——— Varianta B: Canvas2D procedural (randat o singură dată, 2x) ——— */
function construiesteB(forma, seed) {
  const canvas = document.createElement('canvas')
  canvas.width = SCARA_CANVAS
  canvas.height = SCARA_CANVAS
  canvas.className = 'b2d-canvas'
  canvas.style.width = AFISAT_PX + 'px'
  canvas.style.height = AFISAT_PX + 'px'
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Varianta B — blob canvas procedural')
  const ctx = canvas.getContext('2d')
  const k = SCARA_CANVAS / 400
  // Strălucire exterioară moale (doar în afară, sub obiect).
  ctx.save()
  ctx.scale(k, k)
  ctx.fillStyle = 'rgba(43,107,255,0.35)'
  ctx.filter = 'blur(22px)'
  ctx.beginPath()
  // (contur brut din eșantioane polare — suficient pentru halou)
  for (let g = 0; g <= 360; g += 6) {
    const p = punctConturRaw(forma, g, -6)
    if (g === 0) ctx.moveTo(p[0], p[1])
    else ctx.lineTo(p[0], p[1])
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Corp marmorat.
  const corp = document.createElement('canvas')
  corp.width = SCARA_CANVAS
  corp.height = SCARA_CANVAS
  picteazaCorp(corp.getContext('2d'), SCARA_CANVAS, forma, seed)
  ctx.drawImage(corp, 0, 0)
  // Luciu + rim-uri (clare, peste corp).
  ctx.save()
  ctx.scale(k, k)
  rimContur(ctx, forma, 195, 262, 11, '#00EFFF', 0.35, 6)
  rimContur(ctx, forma, 18, 92, 11, '#FF36E8', 0.35, 6)
  rimContur(ctx, forma, 195, 262, 4.5, '#8FFCFF', 0.95)
  rimContur(ctx, forma, 18, 92, 4.5, '#FF5CE1', 0.95)
  daraContur(ctx, forma, 292, 348, 13, '#FFFFFF', 0.9)
  daraContur(ctx, forma, 28, 62, 8, '#FFFFFF', 0.85)
  ctx.restore()
  return canvas
}

function punctConturRaw(forma, grade, inset) {
  const a = ((grade - 90) * Math.PI) / 180
  const r = razaLa(forma, a) - inset
  return [forma.cx + Math.cos(a) * r, forma.cy + Math.sin(a) * r]
}

/* ——— Varianta C: hibrid — textură canvas + luciu vectorial SVG ——— */
function construiesteC(forma, seed, id) {
  const tex = document.createElement('canvas')
  tex.width = 560
  tex.height = 560
  picteazaCorp(tex.getContext('2d'), 560, forma, seed)
  const url = tex.toDataURL('image/png')
  const d = pathNeted(forma)
  const dara1 = drumPrinPuncte(arcPuncte(forma, 290, 350, 24))
  const rimCyan = drumPrinPuncte(arcPuncte(forma, 198, 260, 7, 30))
  const rimMag = drumPrinPuncte(arcPuncte(forma, 16, 94, 7, 30))
  return `
  <svg class="b2d-svg" viewBox="0 0 400 400" role="img" aria-label="Varianta C — blob hibrid">
    <defs>
      <radialGradient id="${id}-umbra" cx="0.68" cy="0.74" r="0.62">
        <stop offset="0" stop-color="#0B0620" stop-opacity="0.5"/><stop offset="0.65" stop-color="#0B0620" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id}-lumina" cx="0.34" cy="0.28" r="0.55">
        <stop offset="0" stop-color="#DFFBFF" stop-opacity="0.42"/><stop offset="0.7" stop-color="#DFFBFF" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-dara" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.95"/>
        <stop offset="0.62" stop-color="#E8FDFF" stop-opacity="0.9"/><stop offset="1" stop-color="#8FFCFF" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${id}-rimc" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#00EFFF" stop-opacity="0.1"/><stop offset="0.6" stop-color="#00EFFF" stop-opacity="0.95"/><stop offset="1" stop-color="#8FFCFF" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="${id}-rimm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FF7AEF" stop-opacity="0.9"/><stop offset="0.6" stop-color="#FF36E8" stop-opacity="0.95"/><stop offset="1" stop-color="#FF36E8" stop-opacity="0.1"/>
      </linearGradient>
      <filter id="${id}-moale" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
      <clipPath id="${id}-taietura"><path d="${d}"/></clipPath>
    </defs>
    <g clip-path="url(#${id}-taietura)">
      <image href="${url}" x="0" y="0" width="400" height="400" preserveAspectRatio="xMidYMid slice"/>
      <path d="${d}" fill="url(#${id}-umbra)"/>
      <path d="${d}" fill="url(#${id}-lumina)"/>
    </g>
    <path d="${d}" fill="none" stroke="url(#${id}-rimc)" stroke-width="11" stroke-linecap="round" opacity="0.3" filter="url(#${id}-moale)"/>
    <path d="${d}" fill="none" stroke="url(#${id}-rimm)" stroke-width="11" stroke-linecap="round" opacity="0.3" filter="url(#${id}-moale)"/>
    <path d="${rimCyan}" fill="none" stroke="url(#${id}-rimc)" stroke-width="4.5" stroke-linecap="round" opacity="0.95"/>
    <path d="${rimMag}" fill="none" stroke="url(#${id}-rimm)" stroke-width="4.5" stroke-linecap="round" opacity="0.95"/>
    <path d="${dara1}" fill="none" stroke="url(#${id}-dara)" stroke-width="12" stroke-linecap="round" opacity="0.9"/>
  </svg>`
}

function rasterizeazaSVG(svgEl, nume) {
  const clona = svgEl.cloneNode(true)
  clona.setAttribute('width', '800')
  clona.setAttribute('height', '800')
  const xml = new XMLSerializer().serializeToString(clona)
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = 800
    c.height = 800
    c.getContext('2d').drawImage(img, 0, 0, 800, 800)
    descarcaPNG(c, nume)
  }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
}

/* ——— Asamblare pagină ——— */

const wit = document.getElementById('vitrina-a')
if (wit) wit.innerHTML = construiesteA(FORME[0], 'b2da')

const wbt = document.getElementById('vitrina-b')
let canvasB = null
if (wbt) {
  canvasB = construiesteB(FORME[1], 4102)
  wbt.appendChild(canvasB)
}

const wct = document.getElementById('vitrina-c')
let svgC = null
if (wct) {
  wct.innerHTML = construiesteC(FORME[2], 7703, 'b2dc')
  svgC = wct.querySelector('svg')
}

document.getElementById('descarca-a')?.addEventListener('click', () => {
  const svg = document.querySelector('#vitrina-a svg')
  if (svg) rasterizeazaSVG(svg, 'blob-2d-a.png')
})
document.getElementById('descarca-b')?.addEventListener('click', () => {
  if (canvasB) descarcaPNG(canvasB, 'blob-2d-b.png')
})
document.getElementById('descarca-c')?.addEventListener('click', () => {
  const svg = document.querySelector('#vitrina-c svg')
  if (svg) rasterizeazaSVG(svg, 'blob-2d-c.png')
})

// Varianta D — imagine randată Blender, cu eroare vizibilă la asset lipsă.
{
  const imgD = document.getElementById('img-d')
  const errD = document.getElementById('eroare-d')
  const arataEroare = (mesaj) => {
    if (errD) {
      errD.hidden = false
      errD.textContent = mesaj
    }
    if (imgD) imgD.style.display = 'none'
  }
  if (imgD && !imgD.complete) {
    imgD.addEventListener('error', () => arataEroare('Eroare: assetul Blender (blender-blob.png) lipsește sau nu s-a încărcat.'), { once: true })
  }
  document.getElementById('descarca-d')?.addEventListener('click', () => {
    if (!imgD || !imgD.complete || imgD.naturalWidth === 0) {
      arataEroare('Eroare: nu există imagine de descărcat (assetul Blender lipsește).')
      return
    }
    const a = document.createElement('a')
    a.href = imgD.currentSrc || imgD.src
    a.download = 'blob-blender-d.png'
    a.click()
  })
}

// Varianta D2 — randare Cycles rafinată (aceeași schemă ca D).
{
  const imgD2 = document.getElementById('img-d2')
  const errD2 = document.getElementById('eroare-d2')
  const arataEroare2 = (mesaj) => {
    if (errD2) {
      errD2.hidden = false
      errD2.textContent = mesaj
    }
    if (imgD2) imgD2.style.display = 'none'
  }
  if (imgD2 && !imgD2.complete) {
    imgD2.addEventListener('error', () => arataEroare2('Eroare: assetul Blender D2 (blob-d2.png) lipsește sau nu s-a încărcat.'), { once: true })
  }
  document.getElementById('descarca-d2')?.addEventListener('click', () => {
    if (!imgD2 || !imgD2.complete || imgD2.naturalWidth === 0) {
      arataEroare2('Eroare: nu există imagine de descărcat (assetul Blender D2 lipsește).')
      return
    }
    const a = document.createElement('a')
    a.href = imgD2.currentSrc || imgD2.src
    a.download = 'blob-blender-d2.png'
    a.click()
  })
}

const btnFundal = document.getElementById('btn-fundal')
btnFundal?.addEventListener('click', () => {
  const pag = document.getElementById('pagina-b2d')
  const sah = pag.classList.toggle('fundal-sah')
  btnFundal.textContent = sah ? 'Fundal: tablă de șah' : 'Fundal: deschis'
  btnFundal.setAttribute('aria-pressed', String(sah))
})
