// Invisible measurement anchors: centers in section percentages, diameter
// in viewport width. Only the shared WebGL scene renders the artwork.
const hero = [
  { x: -1, y: 6, size: 44, shape: 'cloud', rotation: -25, phase: 0.2, look: [-0.15, 0.30, -0.20] },
  { x: 103, y: 8, size: 42, shape: 'ribbon', rotation: 27, phase: 2.3, look: [0.12, 0.45, 0.15] },
  { x: 1, y: 117, size: 68, shape: 'fold', rotation: -85, phase: 4.2, look: [0.20, -0.50, 0.25] },
  { x: 103, y: 120, size: 60, shape: 'double', rotation: -30, phase: 1.7, look: [0.10, 0.55, -0.30] },
  { x: 31.4, y: 17, size: 7.1, shape: 'bean', rotation: 36, phase: 3.6 },
  { x: 63.8, y: 14.6, size: 2.3, shape: 'sphere', phase: 1.1 },
  { x: 59.4, y: 26.5, size: 4.6, shape: 'sphere', phase: 5.2 },
  { x: 89.3, y: 43.2, size: 3.5, shape: 'pebble', phase: 2.6 },
  { x: 95.8, y: 32.4, size: 2.5, shape: 'sphere', phase: 4.7 },
  { x: 87, y: 65, size: 9.2, shape: 'bean', rotation: -37, phase: 0.8 },
  { x: 14.2, y: 54.7, size: 2.4, shape: 'sphere', phase: 3.2 },
  { x: 40.2, y: 86.3, size: 4.7, shape: 'double', rotation: 32, phase: 1.4 },
  { x: 53, y: 97, size: 6.5, shape: 'sphere', phase: 2.1, depth: 1 },
  { x: 4, y: 36, size: 13, shape: 'bean', rotation: -54, phase: 6 },
]
const heroComplexity = ['complex', 'complex', 'complex', 'complex', 'moderate', 'simple', 'moderate', 'simple', 'simple', 'moderate', 'simple', 'moderate', 'moderate', 'moderate']

export function resolveBubbleDescriptor(anchor, mobile) {
  return {
    family: mobile && anchor.mobileShape ? anchor.mobileShape : anchor.shape,
    complexity: mobile && anchor.mobileComplexity ? anchor.mobileComplexity : anchor.baseComplexity || anchor.complexity,
  }
}

export function createBubbleAnchors() {
  const anchors = []
  let bodyOrdinal = 0
  document.querySelectorAll('main > section').forEach((section, index) => {
    const layer = section.querySelector('.neon-camp')
    if (!layer) return
    const ordinal = section.id === 'hero' ? 0 : ++bodyOrdinal
    const leftComplex = ordinal % 2 === 0
    const complexFamily = ordinal % 3 === 0 ? 'double' : 'cloud'
    const moderateFamily = ordinal % 3 === 1 ? 'bean' : 'double'
    const layout = section.id === 'hero' ? hero.map((item, slot) => ({
      ...item, complexity: heroComplexity[slot],
      ...(slot === 3 ? { mobileComplexity: 'moderate' } : {}),
      ...(slot === 6 ? { mobileComplexity: 'simple' } : {}),
      ...(slot === 11 ? { mobileComplexity: 'simple', mobileShape: 'pebble' } : {}),
    })) : [
      { x: -4, y: 34, size: 27, shape: leftComplex ? complexFamily : moderateFamily, complexity: leftComplex ? 'complex' : 'moderate', rotation: index * 31, phase: index },
      { x: 104, y: 72, size: 30, shape: leftComplex ? moderateFamily : complexFamily, complexity: leftComplex ? 'moderate' : 'complex', rotation: -index * 28, phase: index + 2 },
      { x: 81, y: 9, size: 3.3, shape: 'pebble', complexity: ordinal % 3 === 0 ? 'simple' : 'moderate', phase: index + 0.7 },
      { x: 12, y: 90, size: 2.2, shape: 'sphere', complexity: 'simple', phase: index + 4.4 },
    ]
    for (const [slot, config] of layout.entries()) {
      const element = document.createElement('span')
      element.className = 'bubble-anchor'
      element.style.cssText = `--bx:${config.x}%;--by:${config.y}%;--bs:${config.size}vw`
      layer.append(element)
      anchors.push({ element, section, id: `${section.id || section.classList[0]}:${slot}`, ...config })
    }
  })
  document.querySelectorAll('.glass-project').forEach((element, index) => {
    anchors.push({ element, section: element.closest('section'), id: `project:${index}`, complexity: 'complex', shape: index ? 'bean' : 'cloud', rotation: index ? -30 : 15, phase: index + 1.6, project: true })
  })
  return anchors
}
