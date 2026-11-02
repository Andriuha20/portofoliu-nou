import { menuChoreography as timeline, menuEasing } from './menu-choreography.js'
import { menuMotionPreference, attachMenuMotionControl } from './menu-motion-preference.js'

export function createMenuTransition(overlay, onClosed) {
  const root = document.documentElement
  const removeMotionControl = attachMenuMotionControl(overlay)
  const backdrop = document.createElement('div')
  backdrop.className = 'menu-backdrop'
  backdrop.hidden = true
  backdrop.setAttribute('aria-hidden', 'true')
  document.body.append(backdrop)
  let animations = [], disposed = false
  const notify = () => window.dispatchEvent(new CustomEvent('portfolio:menu-motion'))

  function setOpen(open) {
    if (disposed) return
    const now = document.timeline.currentTime ?? performance.now()
    const reduce = !menuMotionPreference.enabled
    const state = timeline.setOpen(open, now, reduce)
    const version = state.version
    animations.forEach(animation => animation.cancel())
    animations = []
    overlay.hidden = false
    overlay.inert = !open
    overlay.classList.toggle('open', open)
    backdrop.hidden = false
    root.dataset.menuScene = 'active'

    function animate(element, key, frames) {
      const track = state.tracks[key]
      if (reduce || !element.animate) {
        Object.assign(element.style, frames(track.to))
        return
      }
      const animation = element.animate([frames(track.from), frames(track.to)], {
        delay: track.delay, duration: track.duration, fill: 'both', easing: menuEasing[open ? 'enter' : 'exit'],
      })
      animation.startTime = now
      animations.push(animation)
    }
    animate(backdrop, 'backdrop', value => ({ opacity: value }))
    overlay.querySelectorAll('.menu-list a').forEach((link, i) => {
      animate(link, `link:${i}`, value => ({ opacity: value, transform: `translate3d(0, ${(1 - value) * 108}%, 0)` }))
    })
    overlay.querySelectorAll('.menu-tema, .menu-foot').forEach(element => {
      animate(element, 'chrome', value => ({ opacity: value, transform: `translate3d(0, ${(1 - value) * 12}px, 0)` }))
    })
    // A no-op animation keeps the DOM lifecycle tied to the last 3D track,
    // not to the shorter background/text animations. It does not run a JS loop.
    const end = overlay.animate?.([{ offset: 0 }, { offset: 1 }], { duration: state.endsAt - now })
    if (end) { end.startTime = now; animations.push(end) }
    notify()
    Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (disposed || timeline.state.version !== version) return
      if (!open) {
        overlay.hidden = true
        backdrop.hidden = true
        delete root.dataset.menuScene
        onClosed?.()
      }
      notify()
    })
  }
  const onMotion = () => { if (!overlay.hidden) setOpen(timeline.state.open) }
  const unsubscribe = menuMotionPreference.subscribe(onMotion)
  return {
    setOpen,
    dispose() {
      disposed = true
      unsubscribe()
      removeMotionControl()
      animations.forEach(animation => animation.cancel())
      timeline.setOpen(false, performance.now(), true)
      backdrop.remove()
      delete root.dataset.menuScene
      notify()
    },
  }
}
