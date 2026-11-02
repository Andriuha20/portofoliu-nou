// Page-only opt-in. Keep the already-working menu preference/behaviour separate.
const browser = typeof window !== 'undefined'
const key = 'page-motion-experiment-2'
const media = browser ? matchMedia('(prefers-reduced-motion: reduce)') : null
let choice = null
try {
  const saved = browser ? localStorage.getItem(key) : null
  if (saved === 'on' || saved === 'off') choice = saved === 'on'
} catch {}
const requested = browser ? new URLSearchParams(location.search).get('page-motion') : null
if (requested === 'on' || requested === 'off') {
  choice = requested === 'on'
  try { localStorage.setItem(key, requested) } catch {}
}
const notify = () => window.dispatchEvent(new CustomEvent('portfolio:page-motion-preference'))
media?.addEventListener('change', notify)
export const pageMotionPreference = {
  get enabled() { return choice === null ? !media?.matches : choice },
  get explicit() { return choice },
}
if (import.meta.hot) import.meta.hot.dispose(() => media?.removeEventListener('change', notify))
