import { Euler, Matrix3, Matrix4, Mesh, PerspectiveCamera, Scene, Vector3, Vector4 } from 'three'
import { createBubbleProfile, fitSculpture } from './individuality.js'
import { createMenuMotionProfile, sampleMenuMotion } from './menu-motion.js'
import { menuChoreography as timeline } from '../menu-choreography.js'

export const menuBubblePresets = [
  { id: 'menu:sculpture', family: 'fold', complexity: 'complex', x: 1.055, y: 0.51, radius: 0.25, heightCap: 0.47, z: 180, angle: -0.60, look: [0.16, -0.34, 0.12], softness: 0, entry: [0.48, -0.03], parallax: 16 },
  { id: 'menu:upper-bean', family: 'bean', complexity: 'moderate', x: 0.755, y: 0.205, radius: 0.064, heightCap: 0.14, z: -320, angle: 0.56, look: [-0.24, 0.42, -0.12], softness: 0.28, entry: [0.28, -0.11], parallax: 6 },
  { id: 'menu:lower-double', family: 'double', complexity: 'complex', x: 0.80, y: 0.79, radius: 0.078, heightCap: 0.155, z: -70, angle: -0.72, look: [0.3, -0.18, 0.36], softness: 0.12, entry: [0.26, 0.13], parallax: 10 },
  { id: 'menu:distant-pebble', family: 'pebble', complexity: 'simple', x: 0.65, y: 0.47, radius: 0.025, heightCap: 0.06, z: -500, angle: 0.30, look: [-0.18, -0.4, 0.64], softness: 0.42, entry: [0.19, -0.07], parallax: 4 },
  { id: 'menu:small-orbit', family: 'sphere', complexity: 'simple', x: 0.69, y: 0.87, radius: 0.018, heightCap: 0.045, z: -240, angle: -0.18, look: [0.38, 0.26, -0.45], softness: 0.22, entry: [-0.08, 0.22], parallax: 7 },
]

// Layout uses projected CSS pixels; actual meshes occupy distinct perspective
// depths. Exclusion rectangles are measured only on open/resize, never per frame.
export function placeMenuBubble(preset, index, width, height, mobile, exclusions = []) {
  if (mobile && index > 2) return { enabled: false, x: 0, y: 0, radius: 0 }
  let x = preset.x * width, y = preset.y * height
  let radius = Math.min(width * preset.radius, height * preset.heightCap, 430)
  if (mobile) {
    x = [1.16, 0.88, 1.045][index] * width
    y = [0.47, 0.18, 0.82][index] * height
    radius = Math.min(width * [0.36, 0.12, 0.14][index], height * [0.26, 0.10, 0.11][index])
  }
  // Rotation and the liquid warp can extend beyond the nominal radius.
  const extent = radius * 1.24 + (mobile ? 12 : 28)
  for (const rect of exclusions) {
    if (y + extent > rect.top && y - extent < rect.bottom) x = Math.max(x, rect.right + extent + 20)
  }
  return { enabled: true, x, y, radius }
}

export function createMenuBubbleLayer(material, geometries, { captureRendered = false } = {}) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(40, 1, 1, 6000)
  camera.position.z = 1400
  const tanHalfFov = Math.tan(20 * Math.PI / 180)
  let width = 1, height = 1, mobile = false, clock = 0, dark = 0, reduced = false
  const pointer = { x: 0, y: 0, active: false }
  // Generalized from the verified mesh diagnostic: one menu-local clock
  // driven by this renderer's timestamp, independent of the page's clock.
  let lastNow = 0, wasActive = false, hasAnimated = false
  const items = menuBubblePresets.map((preset, index) => {
    const profile = createBubbleProfile(preset.id, preset.complexity, preset.family)
    const item = {
      ...preset, preset, profile, index, mesh: null, geometry: null, fit: null,
      animation: createMenuMotionProfile(profile, index === 0 ? 'large' : index < 3 ? 'medium' : 'small'),
      x: 0, y: 0, radius: 0, enabled: false, progress: 0,
      dx: 0, dy: 0, vx: 0, vy: 0,
      updates: 0, draws: 0, drawnAt: 0, renderedTime: 0,
      renderedWorld: new Vector3(), renderedNdc: new Vector3(), renderedCamera: '',
      renderedRotation: new Vector3(),
      pose: { x: 0, y: 0, rx: 0, ry: 0, rz: 0 },
      sculptFrame: new Matrix3().fromArray(profile.frame),
      sculptA: new Vector4().fromArray(profile.sculptA), sculptB: new Vector4().fromArray(profile.sculptB), sculptC: new Vector4().fromArray(profile.sculptC),
      waves: profile.waves.map(wave => new Vector4().fromArray(wave)),
      waveRates: new Vector3(), breath: new Vector3(), sculptCenter: new Vector3(),
      environmentRotation: new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...preset.look))),
      optics: new Vector3((profile.seed % 1000 / 1000 - 0.5) * 110, 0.78 + (index * 0.173 % 0.4), (profile.seed % 628) / 100),
    }
    return item
  })

  function measure(w, h, isMobile, exclusions = []) {
    width = w; height = h; mobile = isMobile
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    for (const item of items) {
      Object.assign(item, placeMenuBubble(item.preset, item.index, width, height, mobile, exclusions))
      if (!item.enabled) { if (item.mesh) item.mesh.visible = false; continue }
      const geometry = geometries.get(item.family, item.radius)
      if (item.geometry !== geometry) {
        item.geometry = geometry
        item.fit = fitSculpture(geometry, item.profile)
        item.sculptCenter.fromArray(item.fit.center)
      }
      if (!item.mesh) {
        const mesh = new Mesh(geometry, material)
        mesh.frustumCulled = false
        item.mesh = mesh
        mesh.name = item.id
        scene.add(mesh)
        mesh.onBeforeRender = () => {
          const u = material.uniforms
          u.uTime.value = clock; u.uPhase.value = item.index * 1.37
          u.uMotion.value = hasAnimated ? 1 : 0; u.uHover.value = 0; u.uDark.value = dark
          u.uDepth.value = item.softness
          u.uLayerOpacity.value = Math.min(1, item.progress * 5)
          u.uOffsetScale.value = item.mesh.geometry.userData.offsetScale
          u.uEnvironmentRotation.value.copy(item.environmentRotation); u.uOptics.value.copy(item.optics)
          u.uWave1.value.copy(item.waves[0]); u.uWave2.value.copy(item.waves[1]); u.uWave3.value.copy(item.waves[2])
          u.uWaveRates.value.copy(item.waveRates)
          u.uDeformGain.value = item.profile.motion.deformationGain * (0.48 + 0.52 / (1 + item.radius / 180))
          u.uSculptFrame.value.copy(item.sculptFrame)
          u.uSculptA.value.copy(item.sculptA); u.uSculptB.value.copy(item.sculptB); u.uSculptC.value.copy(item.sculptC)
          u.uSculptCenter.value.copy(item.sculptCenter); u.uSculptScale.value = item.fit.scale
          u.uBreath.value.copy(item.breath)
          material.uniformsNeedUpdate = true
        }
        if (captureRendered) mesh.onAfterRender = (_renderer, _scene, renderCamera) => {
          // Read the mesh/camera that the renderer actually submitted, not the
          // calculated target. These matrices are valid after the draw.
          mesh.updateWorldMatrix(true, false)
          renderCamera.updateWorldMatrix(true, false)
          mesh.getWorldPosition(item.renderedWorld)
          item.renderedNdc.copy(item.renderedWorld).project(renderCamera)
          item.renderedCamera = renderCamera.uuid
          item.renderedRotation.set(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z)
          item.renderedTime = clock
          item.drawnAt = performance.now()
          item.draws++
        }
      }
      item.mesh.geometry = geometry
      item.waveRates.fromArray(item.animation.waveRates)
      item.breath.fromArray(item.profile.motion.breath)
      item.breath.x = item.animation.breathRate
      item.breath.z *= 0.5 + 0.5 / (1 + item.radius / 180)
      item.unitsPerPixel = 2 * (camera.position.z - item.z) * tanHalfFov / height
      const scale = item.radius * item.unitsPerPixel
      item.mesh.scale.setScalar(scale)
    }
  }

  function update(now, _pageTime, dt, isDark, isReduced, cursor) {
    dark = isDark
    const active = timeline.active(now)
    if (active && !wasActive) { clock = 0; lastNow = now }
    if (reduced !== isReduced) lastNow = now
    reduced = isReduced
    if (active && !reduced && lastNow) clock += Math.max(0, now - lastNow) / 1000
    lastNow = now
    wasActive = active
    if (active && !reduced) hasAnimated = true
    pointer.active = active && cursor.active && !mobile && !reduced
    pointer.x = (cursor.x / width - 0.5) * 2
    pointer.y = (cursor.y / height - 0.5) * 2
    for (const item of items) {
      if (!item.mesh) continue
      item.progress = timeline.value(`bubble:${item.index}`, now)
      item.mesh.visible = active && item.enabled && item.progress > 0.0001
      if (!item.mesh.visible) continue
      if (!reduced) {
        sampleMenuMotion(item.animation, clock, mobile, item.pose)
        const t = Math.min(1, clock / 0.45), settle = t * t * (3 - 2 * t)
        item.pose.x *= settle; item.pose.y *= settle
        item.pose.rx *= settle; item.pose.ry *= settle; item.pose.rz *= settle
      }
      const tx = pointer.active ? pointer.x * item.parallax : 0
      const ty = pointer.active ? pointer.y * item.parallax * 0.65 : 0
      const spring = item.profile.motion.stiffness / (1 + item.radius / 120)
      const damping = 2 * Math.sqrt(spring) * item.profile.motion.damping
      if (!reduced) {
        item.vx += ((tx - item.dx) * spring - item.vx * damping) * dt
        item.vy += ((ty - item.dy) * spring - item.vy * damping) * dt
        item.dx += item.vx * dt; item.dy += item.vy * dt
      } else { item.vx = item.vy = 0 }
      const entry = 1 - item.progress
      const entryX = item.entry[0] * width + (item.index === 0 ? item.radius * 0.8 : 0)
      // Entrance, independent idle pose and cursor spring remain additive.
      item.screenX = item.x + entry * entryX + item.pose.x + item.dx
      item.screenY = item.y + entry * item.entry[1] * height + item.pose.y + item.dy
      item.mesh.position.set((item.screenX - width / 2) * item.unitsPerPixel, (height / 2 - item.screenY) * item.unitsPerPixel, item.z)
      item.mesh.rotation.set(0.1 + item.pose.rx + entry * 0.08 + item.dy * 0.0008, -0.12 + item.pose.ry + entry * 0.28 + item.dx * 0.0012, item.angle + item.pose.rz - entry * 0.18)
      item.updates++
    }
    return active
  }

  return {
    scene, camera, measure, update,
    needsMotionFrame: now => !reduced && timeline.active(now),
    resetClockSample() { lastNow = 0 },
    inspectRendered(canvas) {
      const rect = canvas.getBoundingClientRect()
      return items.map(item => ({
        id: item.id, mesh: item.mesh?.uuid, camera: item.renderedCamera, scene: scene.uuid,
        elapsed: item.renderedTime,
        worldY: item.renderedWorld.y,
        screenX: rect.left + (item.renderedNdc.x + 1) * rect.width / 2,
        screenY: rect.top + (1 - item.renderedNdc.y) * rect.height / 2,
        updates: item.updates, draws: item.draws, drawnAt: item.drawnAt,
        rotation: item.renderedRotation.toArray(),
        liquidPhase: item.waveRates.x * item.renderedTime + item.profile.waves[0][3],
        visible: !!item.mesh?.visible, paused: reduced,
        menuOpen: timeline.state.open, active: timeline.active(performance.now()),
        menuPhase: !timeline.active(performance.now()) ? 'closed' : performance.now() < timeline.state.endsAt ? timeline.state.open ? 'opening' : 'closing' : 'idle',
      }))
    },
    inspect: () => items.map(item => ({ id: item.id, shape: item.family, seed: item.profile.seed, animationSeed: item.animation.seed, periods: item.animation.periods, depth: item.z, radius: item.radius, x: item.x, y: item.y, screenX: item.screenX, screenY: item.screenY, dx: item.dx, dy: item.dy, progress: item.progress, visible: !!item.mesh?.visible, floatX: item.pose.x, floatY: item.pose.y, shaderTime: clock, deformationPhase: item.waveRates.x * clock + item.profile.waves[0][3], rotation: item.mesh?.rotation.toArray(), vertices: item.geometry?.attributes.position.count || 0 })),
    dispose() { scene.clear() }, // Geometry and the material belong to the page renderer.
  }
}
