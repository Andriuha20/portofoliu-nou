export const bubbleShapeNames = ['sphere', 'pebble', 'bean', 'double', 'cloud', 'ribbon', 'fold']

// Curated, low-frequency deformations of a sphere. Keeping the longitudinal
// coordinate monotone and both cross sections inflated avoids pinched tips,
// self intersections and the polar singularities of angular displacement.
export function sculptLiquidShape(geometry, kind) {
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i)
    if (kind === 'bean') {
      const ring = Math.max(0, 1 - x * x)
      const waist = Math.exp(-(((x - 0.04) / 0.36) ** 2))
      const bend = 0.28 * ring
      positions.setXYZ(i,
        x * 1.13,
        y * (0.98 + 0.11 * x - 0.34 * waist) + bend,
        z * (0.94 + 0.06 * x - 0.13 * waist) + 0.045 * ring * Math.sin(x * 2.2))
      continue
    }
    const ring = Math.max(0, 1 - y * y)
    if (kind === 'double') {
      const waist = Math.exp(-(((y + 0.05) / 0.38) ** 2))
      positions.setXYZ(i,
        x * (1.03 + 0.05 * y - 0.28 * waist) + 0.13 * Math.sin(y * 2.4) + 0.10 * ring,
        y * 0.99,
        z * (1.02 + 0.07 * y - 0.14 * waist) + 0.04 * ring * Math.sin(y * 2.4))
      continue
    }
    // A cubic Cartesian harmonic has continuous curvature at the poles.
    const ripple = ((3 * z * x * x - z ** 3) * Math.cos(y * 2.4)
      + (x ** 3 - 3 * x * z * z) * Math.sin(y * 2.4)) * 0.065
    if (kind === 'ribbon') {
      const waist = Math.exp(-(((y + 0.08) / 0.33) ** 2))
      const width = 1.05 + 0.14 * y - 0.33 * waist + 0.07 * Math.cos(y * 3.3 + 0.4)
      positions.setXYZ(i,
        x * width * (1 + ripple) + 0.23 * Math.sin(y * 2.7 + 0.3) - 0.055 * y,
        y * 0.99 + 0.035 * x * ring,
        z * (1.12 + 0.10 * y - 0.18 * waist) * (1 + ripple * 0.7)
          + 0.07 * ring * Math.sin(x * 1.8 + y * 2.1))
    } else if (kind === 'fold') {
      const waist = Math.exp(-(((y - 0.12) / 0.36) ** 2))
      const width = 1.08 - 0.10 * y - 0.32 * waist + 0.06 * Math.cos(y * 2.8 - 0.5)
      positions.setXYZ(i,
        x * width * (1 + ripple * 0.85) + 0.27 * Math.sin(y * 2.45 - 0.65)
          + 0.04 * ring * Math.sin(z * 1.6 + y * 1.8),
        y * 0.98 + 0.025 * x * ring,
        z * (1.11 - 0.05 * y - 0.16 * waist) * (1 + ripple * 0.6)
          + 0.055 * ring * Math.sin(x * 1.9 - y * 1.6))
    }
  }
  return geometry
}
