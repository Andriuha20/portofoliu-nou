const TAU = Math.PI * 2

export function seedFromId(id) {
  let value = 2166136261
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619)
  return value >>> 0
}

function randomSequence(seed) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let n = Math.imul(value ^ value >>> 15, 1 | value)
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n)
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
}

function normalized(x, y, z) {
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
}

export function createBubbleProfile(id, complexity, family) {
  const shape = randomSequence(seedFromId(`${id}:shape`))
  const motion = randomSequence(seedFromId(`${id}:motion`))
  const signed = rng => rng() * 2 - 1
  const range = (rng, min, max) => min + rng() * (max - min)
  const axis = family === 'bean'
    ? normalized(1, signed(shape) * 0.6, signed(shape) * 0.45)
    : normalized(signed(shape) * 0.65, 1, signed(shape) * 0.45)
  const tangent = normalized(axis[1], -axis[0], 0)
  const bitangent = [tangent[1] * axis[2], -tangent[0] * axis[2], tangent[0] * axis[1] - tangent[1] * axis[0]]
  const roll = shape() * TAU, cos = Math.cos(roll), sin = Math.sin(roll)
  const t = tangent.map((v, i) => v * cos + bitangent[i] * sin)
  const b = bitangent.map((v, i) => v * cos - tangent[i] * sin)
  const frame = [...t, ...axis, ...b]
  const strength = complexity === 'simple' ? 0.035 : complexity === 'moderate' ? 0.095 : 0.16
  const center = range(shape, -0.55, 0.45)
  const sculptA = [center, range(shape, 2.2, 5.4), strength * range(shape, 0.8, 1.25), signed(shape) * strength * 0.55]
  const sculptB = [center > 0 ? range(shape, -0.65, -0.1) : range(shape, 0.1, 0.65), range(shape, 2, 5), strength * range(shape, 0.45, 0.8), signed(shape) * strength * 0.45]
  const taper = complexity === 'simple' ? [0.035, 0.025, 0.015] : complexity === 'moderate' ? [0.26, 0.18, 0.10] : [0.30, 0.22, 0.12]
  const sculptC = [signed(shape) * taper[0], signed(shape) * taper[1], signed(shape) * taper[2], range(shape, 0.85, 1.4)]

  const waves = Array.from({ length: 3 }, (_, i) => {
    const direction = normalized(signed(motion), signed(motion), signed(motion))
    const length = range(motion, [1.5, 2.0, 2.5][i], [2.4, 3.1, 3.8][i])
    return [...direction.map(n => n * length), motion() * TAU]
  })
  const parameters = {
    offset: motion() * 23,
    xRates: [range(motion, 0.15, 0.30), range(motion, 0.035, 0.080)],
    yRates: [range(motion, 0.17, 0.32), range(motion, 0.041, 0.091)],
    phases: Array.from({ length: 7 }, () => motion() * TAU),
    driftX: motion() < 0.5 ? -1 : 1, driftY: motion() < 0.5 ? -1 : 1,
    amplitudeX: range(motion, 0.62, 1), amplitudeY: range(motion, 0.64, 1),
    rotationRates: Array.from({ length: 3 }, () => range(motion, 0.045, 0.11) * (motion() < 0.5 ? -1 : 1)),
    rotationAmplitudes: [range(motion, 0.035, 0.075), range(motion, 0.04, 0.09), range(motion, 0.018, 0.042)],
    waveRates: [range(motion, 0.13, 0.25), -range(motion, 0.11, 0.23), range(motion, 0.16, 0.29)],
    deformationGain: range(motion, 0.70, 1),
    breath: [range(motion, 0.10, 0.22), motion() * TAU, range(motion, 0.004, 0.010)],
    stiffness: range(motion, 32, 43), damping: range(motion, 0.92, 1.03),
    response: range(motion, 0.78, 1), hoverRate: range(motion, 4, 7),
    parallax: range(motion, 0.8, 1.08),
  }
  return { id, seed: seedFromId(id), complexity, family, frame, sculptA, sculptB, sculptC, waves, motion: parameters }
}

// Matches the shader's non-affine profile warp. Used once to fit each
// sculpture around its existing anchor, and by independent geometry checks.
export function warpSculpture(x, y, z, profile, out) {
  const f = profile.frame, a = profile.sculptA, b = profile.sculptB, c = profile.sculptC
  const qx = f[0] * x + f[1] * y + f[2] * z
  const s = f[3] * x + f[4] * y + f[5] * z
  const qz = f[6] * x + f[7] * y + f[8] * z
  const g1 = Math.exp(-a[1] * (s - a[0]) ** 2), g2 = Math.exp(-b[1] * (s - b[0]) ** 2)
  const taper = Math.sin(s * c[3]), g0 = Math.exp(-0.85 * s * s)
  const px = qx * (1 + a[2] * g1 - b[2] * g2 + c[0] * taper) + a[3] * g2
  const py = s + 1.2 * a[3] * g1 - 0.9 * b[3] * g2 + c[2] * g0
  const pz = qz * (1 + a[2] * 0.65 * g2 - b[2] * 0.45 * g1 + c[1] * taper) + b[3] * g1
  out[0] = f[0] * px + f[3] * py + f[6] * pz
  out[1] = f[1] * px + f[4] * py + f[7] * pz
  out[2] = f[2] * px + f[5] * py + f[8] * pz
  return out
}

const probeCache = new WeakMap()
export function fitSculpture(geometry, profile) {
  let probes = probeCache.get(geometry)
  if (!probes) {
    const positions = geometry.attributes.position, values = []
    const stride = Math.max(1, Math.floor(positions.count / 768))
    for (let i = 0; i < positions.count; i += stride) values.push(positions.getX(i), positions.getY(i), positions.getZ(i))
    probes = new Float32Array(values)
    probeCache.set(geometry, probes)
  }
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], point = [0, 0, 0]
  for (let i = 0; i < probes.length; i += 3) {
    warpSculpture(probes[i], probes[i + 1], probes[i + 2], profile, point)
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], point[k]); max[k] = Math.max(max[k], point[k]) }
  }
  return { center: min.map((v, i) => (v + max[i]) / 2), scale: 2 / Math.max(max[0] - min[0], max[1] - min[1]) }
}

// The renderer owns the only clock/loop. This sampler has no timers, state
// updates or per-frame allocation; size controls the motion envelope/inertia.
export function sampleBubbleMotion(profile, time, radius, out) {
  const m = profile.motion, sizeRate = 0.5 + 0.58 / (1 + radius / 160)
  const t = time * sizeRate + m.offset, p = m.phases
  const amplitudeX = Math.min(8, radius * 0.065) * m.amplitudeX
  const amplitudeY = Math.min(12, radius * 0.1) * m.amplitudeY
  out.x = amplitudeX * m.driftX * (0.72 * Math.sin(t * m.xRates[0] + p[0]) + 0.28 * Math.sin(t * m.xRates[1] + p[1]))
  out.y = amplitudeY * m.driftY * (0.68 * Math.sin(t * m.yRates[0] + p[2]) + 0.32 * Math.sin(t * m.yRates[1] + p[3]))
  out.rx = m.rotationAmplitudes[0] * (0.8 * Math.sin(t * m.rotationRates[0] + p[4]) + 0.2 * Math.sin(t * m.rotationRates[1] * 0.43 + p[0]))
  out.ry = m.rotationAmplitudes[1] * (0.76 * Math.sin(t * m.rotationRates[1] + p[5]) + 0.24 * Math.sin(t * m.rotationRates[2] * 0.39 + p[1]))
  out.rz = m.rotationAmplitudes[2] * Math.sin(t * m.rotationRates[2] + p[6])
  out.rate = sizeRate
  return out
}
