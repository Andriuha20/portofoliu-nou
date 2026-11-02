import { pageMotionPreference } from './page-motion-preference.js'

// One-shot DOM reveal. Browser-native text animations use the same start time
// as the bubble entrance sampled in the existing WebGL loop; no extra rAF.
export function createHeroExperience() {
  const hero = document.getElementById('hero')
  if (!hero) return null
  const targets = [hero.querySelector('.hero-eyebrow'), ...hero.querySelectorAll('.hero-title .line'), hero.querySelector('.hero-row')].filter(Boolean)
  const originals = targets.map(element => element.style.animation)
  targets.forEach(element => { element.style.animation = 'none' })
  let startedAt = null, disposed = false, moving = pageMotionPreference.enabled
  let intro = null, wake = () => {}, reveals = []
  const introObserver = new MutationObserver(checkIntro)
  const mountObserver = new MutationObserver(checkIntro)
  mountObserver.observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] })

  function begin(now) {
    if (startedAt !== null || disposed) return
    startedAt = now
    introObserver.disconnect(); mountObserver.disconnect()
    hero.dataset.cinematic = moving ? 'revealing' : 'idle'
    if (moving && targets.every(element => element.animate)) reveals = targets.map((element, index) => {
      const delay = [40, 130, 200, 260][index] || 0
      const duration = index === 0 ? 340 : 450
      const animation = element.animate([
        { opacity: 0, transform: `translate3d(0,${index === 0 ? 7 : 15}px,0)` },
        { opacity: 1, transform: 'translate3d(0,0,0)' },
      ], { duration, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })
      animation.startTime = now
      return animation
    })
    Promise.all(reveals.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (!disposed) hero.dataset.cinematic = 'idle'
    })
    wake()
  }

  function checkIntro() {
    const found = document.querySelector('.intro-overlay')
    if (found !== intro) {
      introObserver.disconnect(); intro = found
      if (intro) introObserver.observe(intro, { attributes: true, attributeFilter: ['style', 'data-intro-faza', 'hidden'] })
    }
    // OpenCode opens its radial portal by setting mask-image. Start alongside
    // that reveal, not on the earlier click/compress event. No intro code edits.
    const portal = intro?.style.getPropertyValue('mask-image') || intro?.style.getPropertyValue('-webkit-mask-image')
    const complete = intro?.dataset.introFaza === 'complete'
    if ((!document.body.classList.contains('intro-activ') && !intro) || portal || complete || intro?.hidden) begin(performance.now())
  }

  function onMotion() {
    moving = pageMotionPreference.enabled
    if (!moving) { reveals.forEach(animation => { try { animation.finish() } catch {} }); wake() }
  }
  window.addEventListener('portfolio:page-motion-preference', onMotion)
  checkIntro()
  return {
    setWake(callback) { wake = callback },
    elapsed(now) { return startedAt === null ? 0 : Math.max(0, now - startedAt) },
    get waiting() { return startedAt === null },
    dispose() {
      disposed = true
      introObserver.disconnect(); mountObserver.disconnect()
      window.removeEventListener('portfolio:page-motion-preference', onMotion)
      reveals.forEach(animation => animation.cancel())
      targets.forEach((element, index) => { element.style.animation = originals[index] })
      delete hero.dataset.cinematic
      wake = () => {}
    },
  }
}
