// Additive hero depth, sampled by the existing scene loop. The verified page /
// menu sampler still owns each bubble's independent floating and XYZ rotation.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t) }

export function createHeroDepthProfile(animation) {
  const layer = animation.size === 'large' ? 'foreground' : animation.size === 'medium' ? 'midground' : 'background'
  const near = layer === 'foreground', far = layer === 'background'
  const variation = 0.92 + (animation.seed % 997) / 997 * 0.16
  return {
    layer,
    range: (near ? 11 : far ? 2.8 : 6.2) * variation,
    scroll: (near ? 24 : far ? 5 : 12) * variation,
    stiffness: (near ? 16 : far ? 38 : 26) * variation,
    tilt: near ? 0.013 : far ? 0.011 : 0.020,
    proximity: near ? 0.42 : far ? 0.48 : 0.55,
    entryDelay: (near ? 0 : far ? 240 : 180) + (animation.seed % 5) * 26,
    entryDuration: near ? 650 : 450,
  }
}

export function refineHeroMotion(animation) {
  // Leave the base sampler/shape fields intact. Massive corner sculptures have
  // slower liquid waves and smaller rotations; their reflections keep evolving.
  const near = animation.size === 'large'
  return {
    ...animation,
    periods: animation.periods.map(value => value * (near ? 1.08 : 1)),
    rotationRates: animation.rotationRates.map(value => value * (near ? 0.78 : 0.96)),
    rotationAmplitudes: animation.rotationAmplitudes.map(value => value * (near ? 0.82 : 1)),
    waveRates: animation.waveRates.map(value => value * (near ? 0.68 : 0.94)),
    breathRate: animation.breathRate * (near ? 0.72 : 0.96),
  }
}

export function createHeroDepthState() {
  return { x: 0, y: 0, scroll: 0, vx: 0, vy: 0, vs: 0, rx: 0, ry: 0, entryY: 0, opacity: 1 }
}

// Exact critically damped integration stays stable across refresh rates and
// frame stalls. No temporary vectors, geometry work or React updates per frame.
function spring(state, position, velocity, target, omega, dt) {
  const offset = state[position] - target, v = state[velocity]
  const decay = Math.exp(-omega * dt), c = v + omega * offset
  state[position] = target + (offset + c * dt) * decay
  state[velocity] = (v - omega * c * dt) * decay
}

export function updateHeroDepth(profile, state, input, dt) {
  const gain = input.mobile ? 0.4 : 1
  const x = input.active ? clamp(input.x, -1, 1) : 0
  const y = input.active ? clamp(input.y, -1, 1) : 0
  const omega = Math.sqrt(profile.stiffness)
  spring(state, 'x', 'vx', x * profile.range * gain, omega, dt)
  spring(state, 'y', 'vy', y * profile.range * gain * 0.7, omega, dt)
  spring(state, 'scroll', 'vs', -clamp(input.scroll, 0, 1) * profile.scroll * gain, omega, dt)
  state.rx = -state.y / profile.range * profile.tilt
  state.ry = state.x / profile.range * profile.tilt
  return state
}

export function sampleHeroEntrance(profile, elapsed, moving, out) {
  const t = moving ? smooth((elapsed - profile.entryDelay) / profile.entryDuration) : 1
  const near = profile.layer === 'foreground'
  out.opacity = (near ? 0.92 : 0.64) + (near ? 0.08 : 0.36) * t
  out.entryY = (1 - t) * (near ? 4 : profile.layer === 'background' ? 11 : 8)
  return out
}
