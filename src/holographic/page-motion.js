import { createMenuMotionProfile, sampleMenuMotion } from './menu-motion.js'

// Same verified profile generator/sampler as the menu. Only the page's
// distance/period budgets differ; sculpting fields and the menu are untouched.
export function pageMotionSize(anchor, radius = 0) {
  return anchor.project ? radius >= 180 ? 'large' : 'medium' : anchor.size >= 20 ? 'large' : anchor.size >= 6 ? 'medium' : 'small'
}

export function createPageMotionProfile(bubbleProfile, size) {
  const profile = createMenuMotionProfile(bubbleProfile, size)
  const large = size === 'large', small = size === 'small'
  const menuX = large ? [6.5, 9.9] : small ? [9, 14.7] : [8, 12.5]
  const menuY = large ? [14, 17] : small ? [18, 24.5] : [16, 22.2]
  const pageX = large ? [4.8, 8.8] : small ? [7.2, 14.7] : [7, 12.3]
  const pageY = large ? [9, 14.9] : small ? [12, 22.3] : [12, 19.8]
  const oldPeriod = profile.periods[1]
  const oldRange = large ? [6, 9] : small ? [3, 6] : [4, 7]
  const newRange = large ? [7, 11] : small ? [3, 6] : [5, 8]
  const remap = (value, from, to) => to[0] + (value - from[0]) / (from[1] - from[0]) * (to[1] - to[0])
  profile.amplitudeX = remap(profile.amplitudeX, menuX, pageX)
  profile.amplitudeY = remap(profile.amplitudeY, menuY, pageY)
  profile.periods[1] = remap(oldPeriod, oldRange, newRange)
  profile.periods[0] *= profile.periods[1] / oldPeriod
  profile.rotationAmplitudes = profile.rotationAmplitudes.map(value => value * 0.8)
  profile.waveRates = profile.waveRates.map(value => value * (large ? 0.85 : 0.95))
  profile.breathRate *= 0.9
  return profile
}

export const samplePageMotion = sampleMenuMotion
