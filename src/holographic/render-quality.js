// The existing renderer owns the only MSAA framebuffer. Quality changes use
// measured GPU work, not rAF gaps caused by loading, a hidden tab or the CPU.
export function createRenderQuality(renderer, onChange) {
  const gl = renderer.getContext()
  let timer = gl.getExtension('EXT_disjoint_timer_query_webgl2')
  const maxBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
  const info = {
    nativeDpr: 1, targetDpr: 1, activeDpr: 1,
    msaaSamples: gl.getParameter(gl.SAMPLES), gpuMs: null,
    gpuSamples: 0, changes: 0, gpuTimingSupported: !!timer,
  }
  let signature = '', mobile = false, penalty = 0, target = 1
  let activeQuery = null, pending = [], lastProbe = -Infinity
  let warmupUntil = 0, lastChange = -Infinity, lastSample = 0
  let slowMs = 0, fastMs = 0

  function resetTiming(now = performance.now()) {
    if (!gl.isContextLost()) {
      if (activeQuery) { gl.endQuery(timer.TIME_ELAPSED_EXT); gl.deleteQuery(activeQuery) }
      pending.forEach(query => gl.deleteQuery(query))
    }
    activeQuery = null
    pending = []
    info.gpuMs = null
    lastProbe = -Infinity
    lastSample = 0
    slowMs = fastMs = 0
    warmupUntil = now + 3000
  }

  function configure(width, height, nativeDpr, isMobile, dprCeiling) {
    const nextSignature = `${width}:${height}:${nativeDpr}:${isMobile}:${dprCeiling ?? ''}`
    if (nextSignature !== signature) {
      signature = nextSignature
      mobile = isMobile
      penalty = 0
      // Limit memory at unusually large window sizes without affecting normal
      // 1080p HiDPI desktops. Mobile retains its existing conservative budget.
      // Plafonul DPR vine din nivelul grafic (high/balanced/low); implicit
      // pastreaza comportamentul anterior (2 desktop / 1.25 mobil).
      const plafon = dprCeiling ?? (mobile ? 1.25 : 2)
      const pixelBudget = mobile ? 3_000_000 : 16_000_000
      target = Math.min(nativeDpr, plafon, mobile ? 1.25 : 2,
        Math.sqrt(pixelBudget / Math.max(1, width * height)),
        maxBufferSize / Math.max(width, height))
      resetTiming()
    }
    const minimum = Math.min(target, mobile ? 1 : 1.5)
    info.nativeDpr = nativeDpr
    info.targetDpr = target
    info.activeDpr = Math.max(minimum, target - penalty)
    return info.activeDpr
  }

  function poll(now) {
    if (!timer || !pending.length || gl.isContextLost()) return
    if (gl.getParameter(timer.GPU_DISJOINT_EXT)) { resetTiming(now); return }
    while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
      const query = pending.shift()
      const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1_000_000
      gl.deleteQuery(query)
      // Ignore invalid timer values, including queries crossing a context loss.
      if (!Number.isFinite(ms) || ms <= 0 || ms > 250) continue
      info.gpuMs = info.gpuMs === null ? ms : info.gpuMs * 0.8 + ms * 0.2
      info.gpuSamples++
      const interval = lastSample ? Math.min(500, now - lastSample) : 0
      lastSample = now
      if (now < warmupUntil || now - lastChange < 10000) continue
      // Convergenta rapida: 4s de GPU lent (era 8s) declanseaza primul pas
      // in jos, ca placile slabe sa nu stea mult in prag de sacadare.
      // Mecanismul si pragurile raman neschimbate; pe hardware capabil nu se
      // intampla nimic (nu se atinge plafonul DPR).
      slowMs = info.gpuMs > 20 ? slowMs + interval : 0
      fastMs = info.gpuMs < 9 ? fastMs + interval : 0
      const maxPenalty = Math.max(0, target - Math.min(target, mobile ? 1 : 1.5))
      let next = penalty
      if (slowMs >= 4000) next = Math.min(maxPenalty, penalty + 0.25)
      else if (fastMs >= 12000) next = Math.max(0, penalty - 0.25)
      if (next !== penalty) {
        penalty = next
        lastChange = now
        slowMs = fastMs = 0
        info.changes++
        onChange()
      }
    }
  }

  function beginFrame(now) {
    if (!timer || activeQuery || pending.length >= 2 || now - lastProbe < 250 || gl.isContextLost()) return
    // Cooperate with a profiler if it is already timing this context.
    if (gl.getQuery(timer.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) return
    activeQuery = gl.createQuery()
    gl.beginQuery(timer.TIME_ELAPSED_EXT, activeQuery)
    lastProbe = now
  }

  function endFrame() {
    if (!activeQuery || gl.isContextLost()) { activeQuery = null; return }
    gl.endQuery(timer.TIME_ELAPSED_EXT)
    pending.push(activeQuery)
    activeQuery = null
  }

  function restore() {
    timer = gl.getExtension('EXT_disjoint_timer_query_webgl2')
    info.gpuTimingSupported = !!timer
    resetTiming()
  }

  return { info, configure, poll, beginFrame, endFrame, resetTiming, restore, dispose: resetTiming }
}
