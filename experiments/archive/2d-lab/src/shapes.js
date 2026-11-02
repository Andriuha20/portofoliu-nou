/* Forme organice asimetrice: eșantioane polare de rază + interpolare
   Catmull-Rom → curbe Bézier netede. Aceeași formă alimentează SVG-ul
   (path `d`), SDF-ul pentru Canvas2D și clipPath-ul variantei hibride. */

function catmullRomPuncte(p0, p1, p2, p3, t) {
  const t2 = t * t
  const t3 = t2 * t
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ]
}

function catmullRomInchis(puncte, esantioanePeSegment = 16) {
  const n = puncte.length
  const iesire = []
  for (let i = 0; i < n; i++) {
    const p0 = puncte[(i - 1 + n) % n]
    const p1 = puncte[i]
    const p2 = puncte[(i + 1) % n]
    const p3 = puncte[(i + 2) % n]
    for (let k = 0; k < esantioanePeSegment; k++) {
      iesire.push(catmullRomPuncte(p0, p1, p2, p3, k / esantioanePeSegment))
    }
  }
  return iesire
}

// Raze polare (8 eșantioane, valori diferite = asimetrie garantată).
export const FORME = [
  { id: 'bulb', raze: [1.0, 0.8, 1.12, 0.88, 1.06, 0.78, 1.14, 0.9], cx: 200, cy: 206, raza: 168 },
  { id: 'pata', raze: [0.92, 1.1, 0.82, 1.14, 0.9, 1.02, 0.8, 1.08], cx: 204, cy: 198, raza: 164 },
  { id: 'pana', raze: [1.08, 0.86, 0.96, 1.12, 0.8, 1.0, 0.9, 1.04], cx: 198, cy: 204, raza: 166 },
]

export function punctePolare(forma, w = 400, h = 400) {
  const n = forma.raze.length
  const sx = w / 400
  const sy = h / 400
  return forma.raze.map((r, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return [(forma.cx + Math.cos(a) * r * forma.raza) * sx, (forma.cy + Math.sin(a) * r * forma.raza) * sy]
  })
}

// Path SVG neted (Bézier prin eșantioane Catmull-Rom dese).
export function pathNeted(forma, w = 400, h = 400) {
  const esantioane = catmullRomInchis(punctePolare(forma, w, h), 12)
  let d = `M ${esantioane[0][0].toFixed(1)} ${esantioane[0][1].toFixed(1)}`
  for (let i = 1; i < esantioane.length; i += 3) {
    const p1 = esantioane[i]
    const p2 = esantioane[i + 1] || esantioane[0]
    const p3 = esantioane[i + 2] || esantioane[0]
    d += ` C ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}, ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`
  }
  return d + ' Z'
}

// Raza interpolată la un unghi (pentru SDF în Canvas2D).
export function razaLa(forma, theta) {
  const n = forma.raze.length
  const t = ((theta + Math.PI / 2) / (Math.PI * 2)) * n
  const i0 = ((Math.floor(t) % n) + n) % n
  const i1 = (i0 + 1) % n
  const f = t - Math.floor(t)
  const g = f * f * (3 - 2 * f)
  return (forma.raze[i0] * (1 - g) + forma.raze[i1] * g) * forma.raza
}
