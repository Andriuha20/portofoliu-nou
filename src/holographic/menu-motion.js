import { seedFromId } from './individuality.js'

const TAU = Math.PI * 2

// Menu-only motion: page/intro profiles keep their original slow rhythms.
export function createMenuMotionProfile(bubbleProfile, size) {
  const seed = seedFromId(`${bubbleProfile.id}:menu-idle`)
  let state = seed
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let n = Math.imul(state ^ state >>> 15, 1 | state)
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n)
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
  const range = (min, max) => min + random() * (max - min)
  const direction = () => random() < 0.5 ? -1 : 1
  const large = size === 'large', small = size === 'small'
  const periodY = large ? range(6, 9) : small ? range(3, 6) : range(4, 7)
  const periodX = periodY * range(0.87, 1.14)
  return {
    seed, size,
    amplitudeX: large ? range(6.5, 9.9) : small ? range(9, 14.7) : range(8, 12.5),
    amplitudeY: large ? range(14, 17) : small ? range(18, 24.5) : range(16, 22.2),
    periods: [periodX, periodY],
    directions: [direction(), direction()],
    phases: Array.from({ length: 9 }, () => range(0, TAU)),
    rotationRates: [TAU / range(large ? 17 : 13, large ? 24 : 20), TAU / range(large ? 13 : 10, large ? 19 : 16), TAU / range(18, 27)].map(rate => rate * direction()),
    rotationAmplitudes: [range(0.032, 0.055), large ? range(0.10, 0.15) : range(0.12, 0.19), range(0.018, 0.035)],
    waveRates: bubbleProfile.motion.waveRates.map(rate => rate * range(2.8, 3.7) * (large ? 0.82 : small ? 1.08 : 1)),
    breathRate: TAU / (large ? range(9, 13) : range(7, 11)),
  }
}

// Pure, bounded, allocation-free sampling. Positions are one-way amplitudes;
// the configured desktop peak-to-peak ranges are approximately twice these.
export function sampleMenuMotion(profile, time, mobile, out) {
  const p = profile.phases, mobileGain = mobile ? 0.65 : 1
  const tx = time * TAU / profile.periods[0], ty = time * TAU / profile.periods[1]
  out.x = mobileGain * profile.amplitudeX * profile.directions[0] * (0.86 * Math.sin(tx + p[0]) + 0.14 * Math.sin(tx * 0.618033989 + p[1]))
  out.y = mobileGain * profile.amplitudeY * profile.directions[1] * (0.88 * Math.sin(ty + p[2]) + 0.12 * Math.sin(ty * 0.527864045 + p[3]))
  const rotationGain = mobile ? 0.78 : 1
  out.rx = rotationGain * profile.rotationAmplitudes[0] * Math.sin(time * profile.rotationRates[0] + p[4])
  out.ry = rotationGain * profile.rotationAmplitudes[1] * (0.88 * Math.sin(time * profile.rotationRates[1] + p[5]) + 0.12 * Math.sin(time * profile.rotationRates[1] * 0.43 + p[6]))
  out.rz = rotationGain * profile.rotationAmplitudes[2] * Math.sin(time * profile.rotationRates[2] + p[7])
  return out
}
