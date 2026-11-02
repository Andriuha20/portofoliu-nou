/* VENDOR (read-only, feature/bubble-intro): copie din portofoliu-experimental-2/src/holographic/ (sistemul glass Codex). NU edita aici: la integrare se re-sincronizeaza cu versiunea finala Codex sau se inlocuieste cu import partajat. */
import { DataTexture, DataUtils, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from 'three'

// Bake one small HDR studio: curved softboxes, negative fill, blue/pink walls.
// No texture downloads or per-frame screen-space transmission pass.
export function createStudioEnvironment(bakedData) {
  const width = 1024, height = 512
  const data = bakedData || new Uint16Array(width * height * 4)
  const gauss = (v, s) => Math.exp(-v * v / s)
  if (!bakedData) for (let y = 0; y < height; y++) {
    const lat = (y / (height - 1) - 0.5) * Math.PI
    for (let x = 0; x < width; x++) {
      const lon = (x / width - 0.5) * Math.PI * 2
      const dx = Math.cos(lat) * Math.cos(lon), dy = Math.sin(lat), dz = Math.cos(lat) * Math.sin(lon)
      const field = dy * 0.8 + dx * 0.45 + Math.sin(dz * 3) * 0.12
      const blue = gauss(field - 0.25, 0.026)
      const pink = Math.max(gauss(field + 0.3, 0.038), gauss(dy * 0.6 + dx * 0.3 + dz * 0.45 + 0.15, 0.035) * 0.85)
      const cyan = gauss(dy + dx * 0.4 + dz * 0.15 - 0.3, 0.030)
      const lavender = gauss(dy + dz * 0.6 + 0.4, 0.15)
      const cloud = gauss(dy + dx * 0.3 - dz * 0.6 - 0.1, 0.065) * 0.48
      // A bright studio with coloured reflection panels, rather than a
      // uniformly cobalt room (which made every transmitted ray look opaque).
      let r = 0.32 + dy * 0.015 + cloud * 1.3
      let g = 0.40 + dy * 0.03 + cloud * 1.1
      let b = 0.66 + cloud * 0.6
      r = r * (1 - blue * 0.95) + blue * 0.025
      g = g * (1 - blue * 0.95) + blue * 0.25
      b = b * (1 - blue * 0.95) + blue * 0.95
      r = r * (1 - pink * 0.90) + pink * 0.90
      g = g * (1 - pink * 0.90) + pink * 0.04
      b = b * (1 - pink * 0.90) + pink * 0.60
      r = r * (1 - cyan * 0.70) + cyan * 0.02
      g = g * (1 - cyan * 0.70) + cyan * 0.75
      b += lavender * 0.05
      const panel1 = gauss(dx + 0.39 + dy * 0.1, 0.045) * gauss(dy - 0.55, 0.07) * Math.max(0, dz)
      const panel2 = gauss(dx - 0.5, 0.013) * gauss(dy + 0.05, 0.4) * Math.max(0, -dz)
      const panel3 = gauss(dx + 0.65, 0.012) * gauss(dy + 0.1, 0.18) * Math.max(0, -dz)
      const ribbon = gauss(dy + dx * 0.3 + Math.sin(dz * 2.8) * 0.18 - 0.22, 0.0014) * gauss(dx + 0.1, 0.5)
      const ribbon2 = gauss(dy - dx * 0.48 + Math.sin(dz * 2.2) * 0.2 + 0.34, 0.005) * gauss(dx - 0.2, 0.65)
      // Softboxes supply the bright peaks. Curved strips are secondary,
      // avoiding the repeated white ring previously visible on small spheres.
      const light = panel1 * 3.6 + panel2 * 2.8 + panel3 * 2.0 + ribbon * 0.25 + ribbon2 * 0.40 + gauss(dy - 0.84, 0.006) * 0.7
      const negativeFill = gauss(dy + dx * 0.3 + Math.sin(dz * 2.8) * 0.18 - 0.31, 0.009) * gauss(dx + 0.1, 0.6)
      const shade = (1 - gauss(dx + 0.15, 0.032) * gauss(dy + 0.45, 0.16) * 0.78) * (1 - negativeFill * 0.55)
      const offset = (y * width + x) * 4
      data[offset] = DataUtils.toHalfFloat(Math.max(0.04, r * shade + light))
      data[offset + 1] = DataUtils.toHalfFloat(Math.max(0.04, g * shade + light))
      data[offset + 2] = DataUtils.toHalfFloat(Math.max(0.04, b * shade + light))
      data[offset + 3] = DataUtils.toHalfFloat(1)
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType)
  texture.wrapS = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}
