import { BufferGeometry, Euler, Matrix3, Matrix4, Mesh, OrthographicCamera, Scene, SRGBColorSpace, NoToneMapping, Vector3, Vector4, WebGLRenderer } from 'three'
import { createStudioEnvironment } from './environment.js'
import { createBubbleGeometryCache } from './geometry.js'
import { createGlassMaterial } from './material.js'
import { createRenderQuality } from './render-quality.js'
import { createBubbleProfile, fitSculpture } from './individuality.js'
import { createPageMotionProfile, pageMotionSize, samplePageMotion } from './page-motion.js'
import { pageMotionPreference } from '../page-motion-preference.js'
import { createHeroDepthProfile, createHeroDepthState, refineHeroMotion, sampleHeroEntrance, updateHeroDepth } from './hero-motion.js'
import { resolveBubbleDescriptor } from './layout.js'
import { createMenuBubbleLayer } from './menu-bubbles.js'
import { menuChoreography } from '../menu-choreography.js'
import { menuMotionPreference } from '../menu-motion-preference.js'
import { graphicsQuality } from '../graphics-quality.js'

export function createBubbleScene(anchors, resources = {}, heroExperience = null, options = {}) {
  performance.mark('bubbles:scene-start')
  // Optiune aditiva: paused=true = creeaza tot (renderer, materiale, primul
  // frame de incalzire) dar NU ruleaza bucla; reluarea se face cu
  // setPaused(false). Fara optiune comportamentul e neschimbat.
  let paused = !!options.paused
  function setPaused(p) {
    if (!!p === paused || disposed) return
    paused = !!p
    if (!paused) {
      lastTime = 0
      try { menuLayer.resetClockSample() } catch {}
      try { quality.resetTiming() } catch {}
      schedule()
    }
  }
  const canvas = document.createElement('canvas')
  canvas.id = 'holographic-scene'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.ready = 'false'
  const mobileQuery = matchMedia('(max-width: 700px)')
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  } catch {
    resources.dispose?.()
    return () => {}
  }
  document.body.append(canvas)
  performance.mark('bubbles:context-ready')
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping
  renderer.autoClear = false
  renderer.info.autoReset = false

  const environment = createStudioEnvironment(resources.environment)
  performance.mark('bubbles:environment-ready')
  environment.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), mobileQuery.matches ? 2 : 4)
  const geometries = createBubbleGeometryCache(mobileQuery.matches, resources.topologies)
  const pendingGeometry = new BufferGeometry()
  const material = createGlassMaterial(environment)
  const menuLayer = createMenuBubbleLayer(material, geometries, { captureRendered: import.meta.env.DEV })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 10000)
  camera.position.z = 5000
  const pointer = { x: -10000, y: -10000, active: false }
  const abort = new AbortController()
  const listenerOptions = { signal: abort.signal, passive: true }
  let width = 0, height = 0, scroll = window.scrollY
  let frame = 0, disposed = false, contextLost = false, shaderFailed = false
  let needsMeasure = true, time = 0, lastTime = 0
  let pageMoving = pageMotionPreference.enabled, pageHasAnimated = false
  let dark = document.documentElement.dataset.theme === 'dark' ? 1 : 0
  let pixelRatio = 1
  let pageOpacity = 1, needsMenuMeasure = true
  const heroBounds = { top: 0, height: 1 }
  const heroInput = { x: 0, y: 0, scroll: 0, active: false, mobile: false }
  const quality = createRenderQuality(renderer, () => { needsMeasure = true; schedule() })
  const diagnostics = { ready: false, frames: 0, total: anchors.length, visible: 0, pixelRatio, drawCalls: 0, triangles: 0, motion: pageMoving, contextLost: false }
  diagnostics.quality = quality.info
  if (import.meta.env.DEV) window.__holographic = diagnostics
  renderer.debug.onShaderError = () => { shaderFailed = true }

  const instances = anchors.map((anchor, index) => {
    const seed = (index * 0.61803398875 + (anchor.phase || 0) * 0.137) % 1
    const small = !anchor.project && anchor.size < 15
    const look = anchor.look || [(seed - 0.5) * 1.35, anchor.phase * 0.53 + index * 0.47, (seed - 0.5) * 0.95]
    const environmentRotation = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...look)))
    const descriptor = resolveBubbleDescriptor(anchor, mobileQuery.matches)
    const profile = createBubbleProfile(anchor.id, descriptor.complexity, descriptor.family)
    // Choose the final detail level during measurement, without first building
    // a lower-detail copy that would never be rendered.
    const mesh = new Mesh(pendingGeometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = anchor.depth ? 0 : anchor.project ? 2 : 1
    const hero = anchor.section.id === 'hero'
    const animation = createPageMotionProfile(profile, pageMotionSize(anchor))
    const instance = {
      ...anchor, mesh, x: 0, y: 0, radius: 0, enabled: true,
      dx: 0, dy: 0, vx: 0, vy: 0, hover: 0, active: false,
      phase: anchor.phase || index, angle: (anchor.rotation || 0) * Math.PI / 180,
      family: descriptor.family, complexity: descriptor.complexity, baseComplexity: anchor.complexity, profile,
      animation: hero ? refineHeroMotion(animation) : animation,
      heroDepth: hero ? createHeroDepthProfile(animation) : null,
      heroState: hero ? createHeroDepthState() : null,
      renderedWorld: new Vector3(), renderedNdc: new Vector3(), renderedRotation: new Vector3(),
      renderedTime: 0, renderedFrame: 0, draws: 0,
      pose: { x: 0, y: 0, rx: 0, ry: 0, rz: 0, rate: 1 },
      sculptFrame: new Matrix3().fromArray(profile.frame),
      sculptA: new Vector4().fromArray(profile.sculptA), sculptB: new Vector4().fromArray(profile.sculptB),
      sculptC: new Vector4().fromArray(profile.sculptC),
      waves: profile.waves.map(wave => new Vector4().fromArray(wave)),
      waveRates: new Vector3(), breath: new Vector3(), deformGain: 1,
      sculptCenter: new Vector3(), sculptScale: 1, fittedGeometry: null,
      environmentRotation,
      optics: new Vector3((seed - 0.5) * 130, 0.70 + seed * 0.65, seed * Math.PI * 2),
      tiltX: small ? (seed - 0.5) * 0.65 : 0.10,
      tiltY: small ? Math.sin(index * 2.1) * 0.42 : -0.15,
      scaleX: small ? 0.94 + seed * 0.12 : 1,
      scaleY: small ? 1.07 - seed * 0.14 : 1,
    }
    mesh.onBeforeRender = () => {
      const u = material.uniforms
      u.uTime.value = time
      u.uPhase.value = instance.phase
      u.uMotion.value = pageHasAnimated ? 1 : 0
      u.uHover.value = instance.hover
      u.uOffsetScale.value = mesh.geometry.userData.offsetScale
      u.uDark.value = dark
      u.uDepth.value = anchor.depth || 0
      u.uLayerOpacity.value = pageOpacity * (instance.heroState?.opacity ?? 1)
      u.uEnvironmentRotation.value.copy(instance.environmentRotation)
      u.uOptics.value.copy(instance.optics)
      u.uWave1.value.copy(instance.waves[0]); u.uWave2.value.copy(instance.waves[1]); u.uWave3.value.copy(instance.waves[2])
      u.uWaveRates.value.copy(instance.waveRates)
      u.uDeformGain.value = instance.deformGain
      u.uSculptFrame.value.copy(instance.sculptFrame)
      u.uSculptA.value.copy(instance.sculptA); u.uSculptB.value.copy(instance.sculptB)
      u.uSculptC.value.copy(instance.sculptC)
      u.uSculptCenter.value.copy(instance.sculptCenter); u.uSculptScale.value = instance.sculptScale
      u.uBreath.value.copy(instance.breath)
      material.uniformsNeedUpdate = true
    }
    if (import.meta.env.DEV) mesh.onAfterRender = (_renderer, _scene, renderCamera) => {
      mesh.updateWorldMatrix(true, false)
      renderCamera.updateWorldMatrix(true, false)
      mesh.getWorldPosition(instance.renderedWorld)
      instance.renderedNdc.copy(instance.renderedWorld).project(renderCamera)
      instance.renderedRotation.set(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z)
      instance.renderedTime = time
      instance.renderedFrame = diagnostics.frames + 1
      instance.draws++
    }
    scene.add(mesh)
    return instance
  })
  if (import.meta.env.DEV) {
    Object.defineProperty(diagnostics, 'rendered', {
      get: () => instances.map(item => ({
        id: item.id, section: item.section.id || item.section.classList[0], mesh: item.mesh.uuid,
        worldY: item.renderedWorld.y, screenX: (item.renderedNdc.x + 1) * width / 2,
        screenY: (1 - item.renderedNdc.y) * height / 2, radius: item.radius,
        rotation: item.renderedRotation.toArray(), elapsed: item.renderedTime, draws: item.draws,
        liquidPhase: item.waveRates.x * item.renderedTime + item.profile.waves[0][3],
        visible: item.mesh.visible && item.renderedFrame === diagnostics.frames,
        enabled: item.enabled, size: item.animation.size,
        layer: item.heroDepth?.layer,
        heroOffset: item.heroState ? [item.heroState.x, item.heroState.y, item.heroState.scroll] : undefined,
      })),
    })
    diagnostics.menu = { get instances() { return menuLayer.inspect() }, get rendered() { return menuLayer.inspectRendered(canvas) }, get motionEnabled() { return menuMotionPreference.enabled } }
    Object.defineProperty(diagnostics, 'instances', {
      get: () => instances.map((item, index) => ({ index, id: item.id, shape: item.family, complexity: item.complexity, seed: item.profile.seed, depth: item.depth || 0, x: item.x, y: item.y, dx: item.dx, dy: item.dy, radius: item.radius, hover: item.hover, visible: item.mesh.visible, vertices: item.mesh.geometry.attributes.position?.count || 0, floatX: item.pose.x, floatY: item.pose.y, rotation: [item.mesh.rotation.x, item.mesh.rotation.y, item.mesh.rotation.z], profile: item.profile, sculptFit: { center: item.sculptCenter.toArray(), scale: item.sculptScale }, deformationPhase: item.waveRates.x * time + item.profile.waves[0][3] })),
    })
  }
  performance.mark('bubbles:instances-ready')

  function measure() {
    width = document.documentElement.clientWidth
    height = window.innerHeight
    pixelRatio = quality.configure(width, height, window.devicePixelRatio || 1, mobileQuery.matches, graphicsQuality.dprCeiling(mobileQuery.matches))
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    camera.left = -width / 2
    camera.right = width / 2
    camera.top = height / 2
    camera.bottom = -height / 2
    camera.updateProjectionMatrix()
    const heroRect = document.getElementById('hero')?.getBoundingClientRect()
    if (heroRect) { heroBounds.top = heroRect.top + window.scrollY; heroBounds.height = heroRect.height }
    for (const item of instances) {
      const element = item.element
      item.enabled = element.getClientRects().length > 0
      // offset coordinates ignore reveal transforms and scrolling, so no
      // layout reads are needed inside the animation loop.
      let left = 0, top = 0, node = element
      while (node) {
        left += node.offsetLeft || 0
        top += node.offsetTop || 0
        node = node.offsetParent
      }
      const w = element.offsetWidth, h = element.offsetHeight
      item.x = left + (item.project ? w / 2 : 0)
      item.y = top + (item.project ? h / 2 : 0)
      item.radius = w / 2
      const descriptor = resolveBubbleDescriptor(item, mobileQuery.matches)
      if (item.complexity !== descriptor.complexity || item.family !== descriptor.family) {
        item.family = descriptor.family; item.complexity = descriptor.complexity
        item.profile = createBubbleProfile(item.id, item.complexity, item.family)
        item.sculptFrame.fromArray(item.profile.frame)
        item.sculptA.fromArray(item.profile.sculptA); item.sculptB.fromArray(item.profile.sculptB)
        item.sculptC.fromArray(item.profile.sculptC)
        item.waves.forEach((wave, i) => wave.fromArray(item.profile.waves[i]))
        item.fittedGeometry = null
      }
      item.mesh.geometry = geometries.get(item.family, item.radius * Math.max(item.scaleX, item.scaleY), graphicsQuality.tierMaxim())
      if (item.fittedGeometry !== item.mesh.geometry) {
        const fit = fitSculpture(item.mesh.geometry, item.profile)
        item.sculptCenter.fromArray(fit.center); item.sculptScale = fit.scale
        item.fittedGeometry = item.mesh.geometry
      }
      const size = pageMotionSize(item, item.radius)
      if (item.animation.size !== size) item.animation = createPageMotionProfile(item.profile, size)
      item.waveRates.fromArray(item.animation.waveRates)
      item.breath.fromArray(item.profile.motion.breath)
      item.breath.x = item.animation.breathRate
      item.breath.z *= 0.5 + 0.5 / (1 + item.radius / 180)
      item.deformGain = item.profile.motion.deformationGain * (0.48 + 0.52 / (1 + item.radius / 180))
      item.mesh.scale.set(item.radius * item.scaleX, item.radius * item.scaleY, item.radius)
    }
    needsMeasure = false
    needsMenuMeasure = true
    diagnostics.pixelRatio = pixelRatio
    diagnostics.drawingBuffer = [canvas.width, canvas.height]
  }

  function schedule() {
    if (!frame && !disposed && !contextLost && !document.hidden) frame = requestAnimationFrame(render)
  }
  function render(now) {
    frame = 0
    if (disposed || contextLost || document.hidden) return
    // Scena pauzata (asteapta reveal-ul intro-ului): niciun draw, niciun
    // cost GPU; evenimentele pot incerca schedule(), dar nu se randeaza.
    if (paused) return
    const clockDelta = lastTime ? Math.max(0, (now - lastTime) / 1000) : 0
    const elapsed = lastTime ? Math.min(clockDelta, 0.04) : 1 / 60
    lastTime = now
    // Miscarea paginii poate fi oprita de nivelul grafic LOW (bule statice,
    // randate la cerere): restul logicii de cadre ramane neschimbata.
    const motion = pageMoving && graphicsQuality.motionAllowed()
    if (motion) { time += clockDelta; pageHasAnimated = true }
    // A monitor/zoom change can alter DPR without a CSS resize event. This
    // property read does not force layout or add another animation loop.
    if ((window.devicePixelRatio || 1) !== quality.info.nativeDpr) needsMeasure = true
    quality.poll(now)
    graphicsQuality.poll(now, quality.info.gpuMs)
    if (needsMeasure) measure()
    // Prepare shared menu buffers after the first hero frame; opening never
    // creates a context, material, shader variant or another animation loop.
    if (needsMenuMeasure && (diagnostics.ready || menuChoreography.active(now))) {
      const overlay = document.getElementById('meniu-overlay')
      const exclusions = Array.from(document.querySelectorAll('#meniu-overlay .menu-list li, #meniu-overlay .menu-tema, #meniu-overlay .menu-foot a'), el => el.getBoundingClientRect().toJSON())
      // In short/scrollable menus, protect the entire travel of each link.
      // Decorations then stay clear without layout reads during scrolling.
      if (overlay && overlay.scrollHeight > overlay.clientHeight + 1) {
        exclusions.forEach(rect => { rect.top = -10000; rect.bottom = 10000 })
      }
      menuLayer.measure(width, height, mobileQuery.matches || (height < 500 && width < 1000), exclusions)
      needsMenuMeasure = false
    }
    const menuActive = menuLayer.update(now, time, elapsed, dark, !menuMotionPreference.enabled, pointer)
    pageOpacity = 1 - menuChoreography.value('backdrop', now)
    if (diagnostics.menu) Object.assign(diagnostics.menu, { active: menuActive, open: menuChoreography.state.open, phase: !menuActive ? 'closed' : now < menuChoreography.state.endsAt ? menuChoreography.state.open ? 'opening' : 'closing' : 'idle', backdrop: 1 - pageOpacity, prepared: !needsMenuMeasure })
    if (!diagnostics.frames) performance.mark('bubbles:layout-ready')
    let visible = 0
    heroInput.mobile = mobileQuery.matches
    heroInput.active = motion && finePointer.matches && pointer.active && !menuActive && pointer.y + scroll >= heroBounds.top && pointer.y + scroll <= heroBounds.top + heroBounds.height
    heroInput.x = pointer.x / width * 2 - 1
    heroInput.y = (pointer.y + scroll - heroBounds.top) / heroBounds.height * 2 - 1
    heroInput.scroll = (scroll - heroBounds.top) / heroBounds.height
    for (const item of instances) {
      const y = item.y - scroll
      const margin = item.radius * 1.35 + 30
      item.mesh.visible = item.enabled && y + margin > 0 && y - margin < height
      if (!item.mesh.visible) continue
      visible++
      const moving = motion
      if (moving) {
        samplePageMotion(item.animation, time, mobileQuery.matches, item.pose)
        const t = Math.min(1, time / 0.45), settle = t * t * (3 - 2 * t)
        item.pose.x *= settle; item.pose.y *= settle
        item.pose.rx *= settle; item.pose.ry *= settle; item.pose.rz *= settle
      }
      const floatX = item.pose.x, floatY = item.pose.y
      if (item.heroDepth) {
        if (moving) updateHeroDepth(item.heroDepth, item.heroState, heroInput, elapsed)
        sampleHeroEntrance(item.heroDepth, heroExperience?.elapsed(now) ?? 1000, moving, item.heroState)
      }
      const depthRate = (item.depth ? 0.007 : 0.01 + Math.min(1, item.radius / (width * 0.25)) * 0.008) * item.profile.motion.parallax
      const parallax = moving && !item.project ? Math.max(-18, Math.min(18, (y - height / 2) * depthRate)) : 0
      let targetX = 0, targetY = 0, influence = 0
      if (moving && finePointer.matches && pointer.active && (!item.heroDepth || heroInput.active)) {
        const dx = item.x + floatX - pointer.x
        const dy = y + floatY - pointer.y
        const distance = Math.hypot(dx, dy)
        const reach = Math.min(item.radius, 220) + 110
        influence = Math.max(0, 1 - distance / reach)
        const strength = influence * influence * Math.min(26, 14 + item.radius * 0.035) * item.profile.motion.response * (item.heroDepth?.proximity ?? 1)
        // A softened centre makes the vector field continuous when the cursor
        // crosses a bubble. Normalizing by distance alone flips at its centre.
        const softCore = Math.max(28, Math.min(90, item.radius * 0.4))
        const directionLength = Math.hypot(distance, softCore)
        targetX = dx / directionLength * strength
        targetY = dy / directionLength * strength
      }
      // Damped springs: mass increases with size; all values are delta-time
      // based so motion is stable on 60 Hz, 120 Hz and slower devices.
      const spring = item.profile.motion.stiffness / (1 + item.radius / 140)
      const damping = 2 * Math.sqrt(spring) * item.profile.motion.damping
      if (moving) {
        item.vx += ((targetX - item.dx) * spring - item.vx * damping) * elapsed
        item.vy += ((targetY - item.dy) * spring - item.vy * damping) * elapsed
        item.dx += item.vx * elapsed
        item.dy += item.vy * elapsed
        item.hover += (influence - item.hover) * (1 - Math.exp(-elapsed * item.profile.motion.hoverRate))
      } else { item.vx = item.vy = 0 }
      const depth = item.depth ? -200 : !item.project && item.radius < width * 0.12 ? 900 : 0
      const hero = item.heroState
      item.mesh.position.set(item.x - width / 2 + floatX + item.dx + (hero?.x || 0), height / 2 - y - floatY - item.dy - parallax - (hero ? hero.y + hero.scroll + hero.entryY : 0), depth)
      item.mesh.rotation.set(
        item.tiltX + item.pose.rx + (hero?.rx || 0) - (hero ? item.dy / Math.max(120, item.radius) * 0.12 : 0),
        item.tiltY + item.pose.ry + (hero?.ry || 0) + (hero ? item.dx / Math.max(120, item.radius) * 0.12 : 0),
        item.angle + item.pose.rz,
      )
    }
    try {
      quality.beginFrame(now)
      if (!diagnostics.frames) performance.mark('bubbles:draw-start')
      renderer.info.reset()
      renderer.clear()
      if (pageOpacity > 0.0001) renderer.render(scene, camera)
      if (menuActive) {
        renderer.clearDepth()
        renderer.render(menuLayer.scene, menuLayer.camera)
      }
      if (!diagnostics.frames) performance.mark('bubbles:first-frame')
      quality.endFrame()
      if (shaderFailed) { dispose(); return }
      // Reveal only after measuring the current layout and successfully drawing
      // the current geometry/material. There is no alternate bubble layer.
      if (!diagnostics.ready) canvas.dataset.ready = 'true'
      diagnostics.ready = true
      diagnostics.visible = visible
      diagnostics.frames++
      diagnostics.graphicsQuality = graphicsQuality.info()
      diagnostics.drawCalls = renderer.info.render.calls
      diagnostics.triangles = renderer.info.render.triangles
      diagnostics.programs = renderer.info.programs.length
    } catch (error) {
      quality.endFrame()
      console.warn('WebGL artwork paused; keeping the page background.', error)
      dispose()
      return
    }
    if (needsMenuMeasure || motion || menuLayer.needsMotionFrame(now) || (menuActive && performance.now() < menuChoreography.state.endsAt)) schedule()
  }

  const invalidateLayout = () => { needsMeasure = true; schedule() }
  const onScroll = () => { scroll = window.scrollY; schedule() }
  const onPointer = event => {
    if (event.pointerType === 'touch') return
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true
  }
  const resetPointer = () => { pointer.active = false }
  let resolutionQuery
  function watchResolution() {
    resolutionQuery?.removeEventListener('change', onResolutionChange)
    resolutionQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    resolutionQuery.addEventListener('change', onResolutionChange, { signal: abort.signal })
  }
  function onResolutionChange() { watchResolution(); invalidateLayout() }
  watchResolution()
  window.addEventListener('scroll', onScroll, listenerOptions)
  // Remasurarea la resize e scumpa (offseturi, potrivire sculpt, profiluri):
  // in timpul unui drag de redimensionare se amana pe trailing edge.
  let resizeTmr = 0
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTmr)
    resizeTmr = window.setTimeout(invalidateLayout, 120)
  }, listenerOptions)
  window.addEventListener('pointermove', onPointer, listenerOptions)
  window.addEventListener('portfolio:menu-motion', () => { needsMenuMeasure = true; schedule() }, { signal: abort.signal })
  window.addEventListener('portfolio:menu-motion-preference', () => { pointer.active = false; menuLayer.resetClockSample(); schedule() }, { signal: abort.signal })
  document.documentElement.addEventListener('pointerleave', resetPointer, listenerOptions)
  window.addEventListener('blur', resetPointer, listenerOptions)
  window.addEventListener('pagehide', event => {
    if (!event.persisted) dispose()
  }, { signal: abort.signal })
  document.addEventListener('visibilitychange', () => { lastTime = 0; menuLayer.resetClockSample(); quality.resetTiming(); schedule() }, listenerOptions)
  const onMotion = () => {
    pageMoving = pageMotionPreference.enabled
    diagnostics.motion = pageMoving
    diagnostics.systemReducedMotion = motionQuery.matches
    lastTime = 0
    pointer.active = false
    for (const item of instances) { item.vx = item.vy = 0 }
    schedule()
  }
  window.addEventListener('portfolio:page-motion-preference', onMotion, { signal: abort.signal })
  const themeObserver = new MutationObserver(() => {
    dark = document.documentElement.dataset.theme === 'dark' ? 1 : 0
    pointer.active = false
    schedule()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  // Schimbarea nivelului grafic (manual sau auto): remasoara (DPR plafon,
  // detaliu geometrie) si trezeste bucla pentru tranzitia vizuala.
  const dezaboneazaCalitate = graphicsQuality.onChange(() => {
    diagnostics.graphicsQuality = graphicsQuality.info()
    needsMeasure = true
    schedule()
  })
  const resizeObserver = new ResizeObserver(invalidateLayout)
  document.querySelectorAll('main > section').forEach(section => resizeObserver.observe(section))
  document.fonts.ready.then(() => {
    performance.mark('bubbles:fonts-ready')
    if (!disposed) invalidateLayout()
  })

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    contextLost = true
    quality.resetTiming()
    diagnostics.contextLost = true
    diagnostics.ready = false
    canvas.dataset.ready = 'false'
    cancelAnimationFrame(frame); frame = 0
  }, { signal: abort.signal })
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false
    quality.restore()
    diagnostics.contextLost = false
    lastTime = 0
    menuLayer.resetClockSample()
    invalidateLayout()
  }, { signal: abort.signal })

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    abort.abort()
    try { dezaboneazaCalitate() } catch {}
    try { window.clearTimeout(resizeTmr) } catch {}
    resolutionQuery?.removeEventListener('change', onResolutionChange)
    themeObserver.disconnect()
    resizeObserver.disconnect()
    quality.dispose()
    menuLayer.dispose()
    geometries.dispose()
    pendingGeometry.dispose()
    resources.dispose?.()
    material.dispose()
    environment.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
    diagnostics.ready = false
    if (import.meta.env.DEV && window.__holographic === diagnostics) delete window.__holographic
  }
  performance.mark('bubbles:interactive')
  heroExperience?.setWake(schedule)
  if (paused) {
    // Warmup-ul ruleaza cu pauza ridicata temporar (sincron, fara curse),
    // apoi pauza se reaplica: un singur frame compilat + randat, zero loop.
    paused = false
    try { render(performance.now()) } catch (e) {
      try { console.warn('[holo] warmup esuat', e) } catch {}
    }
    paused = true
  } else {
    schedule()
  }
  // Compatibilitate: dispose ramane functie apelabila; controlul pauzei e
  // atasat ca metoda (starterul o foloseste, restul o ignora).
  dispose.setPaused = setPaused
  return dispose
}
