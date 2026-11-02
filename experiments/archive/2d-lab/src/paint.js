/* Pictor comun pentru marmorat 2D: câmpuri de culoare fluide +
   dâre speculare + rim-uri care urmăresc conturul. Folosit de
   varianta B (canvas) și de textura variantei C (hibrid). */

import { makeWarp, netezeste } from './noise.js'
import { razaLa } from './shapes.js'

const PALETA = {
  cobalt: [16, 38, 159],
  electric: [20, 91, 255],
  cyan: [0, 239, 255],
  violet: [116, 43, 235],
  magenta: [255, 54, 232],
  alb: [246, 248, 255],
}

function amesteca(c1, c2, t) {
  return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]
}

function catMica(culoare) {
  return `rgb(${Math.round(culoare[0])},${Math.round(culoare[1])},${Math.round(culoare[2])})`
}

// Pictează corpul marmorat (per-pixel) pe ctx, în spațiul 0..400.
export function picteazaCorp(ctx, S, forma, seed) {
  const warp = makeWarp(seed)
  const img = ctx.createImageData(S, S)
  const d = img.data
  const k = S / 400
  const cx = forma.cx * k
  const cy = forma.cy * k
  const scara = 0.012
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = x / k
      const py = y / k
      const dx = px - forma.cx
      const dy = py - forma.cy
      const rho = Math.hypot(dx, dy)
      const theta = Math.atan2(dy, dx)
      const margine = razaLa(forma, theta)
      const inauntru = netezeste((margine - rho) / 3)
      const idx = (y * S + x) * 4
      if (inauntru <= 0) {
        d[idx + 3] = 0
        continue
      }
      const w = warp(px * scara, py * scara)
      const r = warp(px * scara * 1.2 + 2.2 * w.qx, py * scara * 1.2 + 2.2 * w.qy).r
      let col = amesteca(PALETA.cobalt, PALETA.electric, netezeste((r - 0.25) / 0.5))
      col = amesteca(col, PALETA.violet, netezeste((w.r - 0.45) / 0.4) * 0.7)
      col = amesteca(col, PALETA.cyan, netezeste((r - 0.55) / 0.35) * netezeste((w.qy - 0.3) / 0.4) * 0.8)
      col = amesteca(col, PALETA.magenta, netezeste((r + w.qx * 0.25 - 0.62) / 0.33) * 0.6)
      const nori = netezeste((w.r - 0.55 + (r - 0.5) * 0.3) / 0.4)
      col = amesteca(col, PALETA.alb, Math.min(1, Math.max(0, nori)) * 0.45)
      // Umbrire internă: lumină din stânga-sus, umbră indigo jos-dreapta.
      const lumina = ((-dx - dy) / (2 * margine)) * 0.5 + 0.5
      const umbra = 0.72 + 0.38 * netezeste(lumina)
      const adanc = 1 - 0.25 * netezeste(rho / margine)
      d[idx] = Math.min(255, col[0] * umbra * adanc)
      d[idx + 1] = Math.min(255, col[1] * umbra * adanc)
      d[idx + 2] = Math.min(255, col[2] * umbra * adanc)
      d[idx + 3] = Math.round(255 * inauntru)
    }
  }
  ctx.putImageData(img, 0, 0)
}

// Punct pe contur, spre interior cu `inset` px (spațiul 0..400).
export function punctContur(forma, grade, inset = 14, w = 400, h = 400) {
  const a = ((grade - 90) * Math.PI) / 180
  const r = razaLa(forma, a) - inset
  const sx = w / 400
  const sy = h / 400
  return [(forma.cx + Math.cos(a) * r) * sx, (forma.cy + Math.sin(a) * r) * sy]
}

// Dâră speculară curbată între două unghiuri (urmează conturul).
export function daraContur(ctx, forma, g0, g1, latime, culoare, alpha, w = 400, h = 400) {
  const pasi = 24
  const pts = []
  for (let i = 0; i <= pasi; i++) {
    pts.push(punctContur(forma, g0 + ((g1 - g0) * i) / pasi, 16, w, h))
  }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const grad = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[pasi][0], pts[pasi][1])
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.3, `rgba(255,255,255,${alpha})`)
  grad.addColorStop(0.7, `${culoare}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.strokeStyle = grad
  ctx.lineWidth = latime
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i += 2) {
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
  }
  ctx.stroke()
  ctx.restore()
}

// Rim luminos de-a lungul conturului (arc întreg sau parțial).
export function rimContur(ctx, forma, g0, g1, latime, culoare, alpha, blur = 0, w = 400, h = 400) {
  ctx.save()
  if (blur > 0) ctx.filter = `blur(${blur}px)`
  const pasi = 40
  ctx.lineCap = 'round'
  ctx.strokeStyle = culoare
  ctx.globalAlpha = alpha
  ctx.lineWidth = latime
  ctx.beginPath()
  for (let i = 0; i <= pasi; i++) {
    const p = punctContur(forma, g0 + ((g1 - g0) * i) / pasi, 5, w, h)
    if (i === 0) ctx.moveTo(p[0], p[1])
    else ctx.lineTo(p[0], p[1])
  }
  ctx.stroke()
  ctx.restore()
}

export function descarcaPNG(canvas, nume) {
  canvas.toBlob((b) => {
    if (!b) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = nume
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }, 'image/png')
}

export { catMica, amesteca, PALETA }
