/* VENDOR (read-only, feature/bubble-intro): copie din portofoliu-experimental-2/src/holographic/ (sistemul glass Codex). NU edita aici: la integrare se re-sincronizeaza cu versiunea finala Codex sau se inlocuieste cu import partajat. */
import { Float32BufferAttribute } from 'three'

// Fit the derivative of the smooth normal in each vertex's tangent plane.
// A normal-offset surface needs this curvature term as well as the gradient
// of its displacement. The old slope-only approximation assumed a plane.
export function addSurfaceDifferentials(geometry) {
  const positions = geometry.attributes.position.array
  const normals = geometry.attributes.normal.array
  const count = geometry.attributes.position.count
  const tangents = new Float32Array(count * 3)
  const bitangents = new Float32Array(count * 3)
  const equations = new Float64Array(count * 7)
  const curvature = new Float32Array(count * 3)
  let maxCurvature = 0

  for (let i = 0; i < count; i++) {
    const k = i * 3, nx = normals[k], ny = normals[k + 1], nz = normals[k + 2]
    let tx = 0, ty = -nz, tz = ny
    if (Math.abs(ny) < 0.9) { tx = nz; ty = 0; tz = -nx }
    const length = Math.hypot(tx, ty, tz)
    tx /= length; ty /= length; tz /= length
    tangents[k] = tx; tangents[k + 1] = ty; tangents[k + 2] = tz
    bitangents[k] = ny * tz - nz * ty
    bitangents[k + 1] = nz * tx - nx * tz
    bitangents[k + 2] = nx * ty - ny * tx
  }

  function accumulate(i, j) {
    const a = i * 3, b = j * 3, row = i * 7
    const ex = positions[b] - positions[a], ey = positions[b + 1] - positions[a + 1], ez = positions[b + 2] - positions[a + 2]
    const x = ex * tangents[a] + ey * tangents[a + 1] + ez * tangents[a + 2]
    const y = ex * bitangents[a] + ey * bitangents[a + 1] + ez * bitangents[a + 2]
    const nx = normals[b] - normals[a], ny = normals[b + 1] - normals[a + 1], nz = normals[b + 2] - normals[a + 2]
    const u = nx * tangents[a] + ny * tangents[a + 1] + nz * tangents[a + 2]
    const v = nx * bitangents[a] + ny * bitangents[a + 1] + nz * bitangents[a + 2]
    const weight = 1 / Math.max(x * x + y * y, 1e-12)
    equations[row] += x * x * weight
    equations[row + 1] += x * y * weight
    equations[row + 2] += y * y * weight
    equations[row + 3] += u * x * weight
    equations[row + 4] += u * y * weight
    equations[row + 5] += v * x * weight
    equations[row + 6] += v * y * weight
  }
  const indices = geometry.index.array
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k], b = indices[k + 1], c = indices[k + 2]
    accumulate(a, b); accumulate(a, c)
    accumulate(b, a); accumulate(b, c)
    accumulate(c, a); accumulate(c, b)
  }
  for (let i = 0; i < count; i++) {
    const k = i * 7
    const xx = equations[k], xy = equations[k + 1], yy = equations[k + 2]
    const ux = equations[k + 3], uy = equations[k + 4], vx = equations[k + 5], vy = equations[k + 6]
    const determinant = xx * yy - xy * xy
    if (determinant < 1e-12) continue
    curvature[i * 3] = (ux * yy - uy * xy) / determinant
    curvature[i * 3 + 1] = ((uy * xx - ux * xy) + (vx * yy - vy * xy)) / (2 * determinant)
    curvature[i * 3 + 2] = (vy * xx - vx * xy) / determinant
    const mid = (curvature[i * 3] + curvature[i * 3 + 2]) * 0.5
    const spread = Math.hypot((curvature[i * 3] - curvature[i * 3 + 2]) * 0.5, curvature[i * 3 + 1])
    maxCurvature = Math.max(maxCurvature, Math.abs(mid - spread), Math.abs(mid + spread))
  }
  geometry.setAttribute('aCurvature', new Float32BufferAttribute(curvature, 3))
  // A fixed offset can cross itself in a tight fold. Bound h*k below 0.4
  // even at maximum hover, retaining the same continuous deformation field.
  // Broad surfaces keep the original amplitude; tight folds move less.
  geometry.userData.offsetScale = Math.min(1, 0.4 / Math.max(0.057 * maxCurvature, 1e-6))
  return geometry
}
