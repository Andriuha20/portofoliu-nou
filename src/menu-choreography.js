// One clock for the DOM reveals and the existing WebGL render loop.
// No timers, DOM reads, animation loops or Three.js dependencies here.
export const menuTracks = {
  backdrop: { enter: [0, 380], exit: [140, 460] },
  chrome: { enter: [400, 480], exit: [0, 180] },
  ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`link:${i}`, { enter: [90 + i * 55, 510], exit: [(5 - i) * 18, 230] }])),
  ...Object.fromEntries([[180, 980, 0, 640], [300, 780, 25, 500], [400, 820, 0, 540], [350, 700, 55, 450], [460, 700, 20, 480]]
    .map(([delay, duration, exitDelay, exitDuration], i) => [`bubble:${i}`, { enter: [delay, duration], exit: [exitDelay, exitDuration] }])),
}

export const menuEasing = { enter: 'cubic-bezier(0.333333, 1, 0.666667, 1)', exit: 'cubic-bezier(0.4, 0, 0.2, 1)' }

function exitEase(x) {
  // Invert the x coordinate of the same cubic used by Web Animations.
  let lo = 0, hi = 1, t = x
  for (let i = 0; i < 12; i++) {
    const v = 1 - t, bx = 1.2 * v * v * t + 0.6 * v * t * t + t * t * t
    if (bx < x) lo = t
    else hi = t
    t = (lo + hi) * 0.5
  }
  return t * t * (3 - 2 * t)
}

export function createMenuChoreography() {
  const tracks = Object.fromEntries(Object.keys(menuTracks).map(key => [key, { from: 0, to: 0, delay: 0, duration: 0 }]))
  const state = { open: false, startedAt: 0, endsAt: 0, version: 0, reduced: false, tracks }
  function value(key, now) {
    const track = tracks[key]
    const t = track.duration ? Math.max(0, Math.min(1, (now - state.startedAt - track.delay) / track.duration)) : 1
    const eased = t === 0 || t === 1 ? t : state.open ? 1 - (1 - t) ** 3 : exitEase(t)
    return track.from + (track.to - track.from) * eased
  }
  function setOpen(open, now, reduced = false) {
    const values = Object.fromEntries(Object.keys(tracks).map(key => [key, value(key, now)]))
    state.open = open; state.reduced = reduced; state.startedAt = now; state.endsAt = now; state.version++
    for (const [key, track] of Object.entries(tracks)) {
      const [delay, duration] = menuTracks[key][open ? 'enter' : 'exit']
      track.from = values[key]; track.to = open ? 1 : 0
      const distance = Math.abs(track.to - track.from)
      track.delay = reduced || distance < 0.001 || (open && track.from > 0.001) ? 0 : delay
      track.duration = reduced ? 0 : duration * distance
      state.endsAt = Math.max(state.endsAt, now + track.delay + track.duration)
    }
    return state
  }
  return { state, value, setOpen, active: now => state.open || now < state.endsAt }
}

export const menuChoreography = createMenuChoreography()
