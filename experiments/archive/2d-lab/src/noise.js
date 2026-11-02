/* Zgomot procedural seed-uit (determinist): PRNG + value noise 2D +
   FBM + domain warp. Folosit de variantele Canvas2D (B) și hibridă (C). */

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeHash2D(seed) {
  const rand = mulberry32(seed)
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y
      case 1: return x - y
      case 2: return -x + y
      case 3: return -x - y
      case 4: return x
      case 5: return -x
      case 6: return y
      default: return -y
    }
  }
  const fade = (t) => t * t * (3 - 2 * t)
  const lerp = (a, b, t) => a + (b - a) * t
  return (x, y) => {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = fade(xf)
    const v = fade(yf)
    const aa = perm[X + perm[Y]] & 7
    const ba = perm[X + 1 + perm[Y]] & 7
    const ab = perm[X + perm[Y + 1]] & 7
    const bb = perm[X + 1 + perm[Y + 1]] & 7
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v,
    ) * 0.7071 + 0.5 // ~[0,1]
  }
}

export function makeFbm(seed, octave = 4) {
  const zgomot = makeHash2D(seed)
  return (x, y) => {
    let v = 0
    let a = 0.5
    let fx = x
    let fy = y
    for (let k = 0; k < octave; k++) {
      v += a * zgomot(fx, fy)
      fx = fx * 2.03 + 1.7
      fy = fy * 2.03 + 9.2
      a *= 0.5
    }
    return v
  }
}

// Domain warp pe 2 niveluri: întoarce câmpul deformat + câmpul de bază.
export function makeWarp(seed) {
  const fbm4 = makeFbm(seed, 4)
  return (x, y) => {
    const qx = fbm4(x * 1.1, y * 1.1)
    const qy = fbm4(x * 1.1 + 5.2, y * 1.1 + 1.3)
    const r = fbm4(x * 1.2 + 2.2 * qx, y * 1.2 + 2.2 * qy)
    return { qx, qy, r }
  }
}

export function netezeste(t) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}
