// A preference/control, not an animation loop. Unchosen preferences follow
// the OS; an explicit request applies only to the fullscreen menu.
export function resolveMenuMotion(reduced, choice) {
  return choice === null ? !reduced : choice
}

const browser = typeof window !== 'undefined'
const key = 'menu-motion-experiment-2'
const query = browser ? new URLSearchParams(location.search) : new URLSearchParams()
const media = browser ? matchMedia('(prefers-reduced-motion: reduce)') : null
let choice = null
try {
  const stored = browser ? localStorage.getItem(key) : null
  if (stored === 'on' || stored === 'off') choice = stored === 'on'
} catch {}
const requested = query.get('menu-motion')
// The owner has explicitly asked to generalize the confirmed diagnostic.
// Existing diagnostic deep links migrate that choice; ordinary visits do not.
if (requested === 'on' || requested === 'off' || (choice === null && ['active', 'runtime-v2'].includes(query.get('codex-test')))) {
  choice = requested !== 'off'
  try { localStorage.setItem(key, choice ? 'on' : 'off') } catch {}
}
const listeners = new Set()
const notify = () => {
  listeners.forEach(listener => listener())
  if (browser) window.dispatchEvent(new CustomEvent('portfolio:menu-motion-preference'))
}
media?.addEventListener('change', notify)

export const menuMotionPreference = {
  get enabled() { return resolveMenuMotion(media?.matches || false, choice) },
  get choice() { return choice },
  setEnabled(enabled) {
    choice = enabled
    try { localStorage.setItem(key, enabled ? 'on' : 'off') } catch {}
    notify()
  },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
}

export function attachMenuMotionControl(overlay) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'menu-motion-toggle'
  const update = () => {
    const enabled = menuMotionPreference.enabled
    button.setAttribute('aria-label', enabled ? 'Oprește animațiile meniului' : 'Activează animațiile meniului')
    button.setAttribute('aria-pressed', String(enabled))
    button.title = button.getAttribute('aria-label')
    button.innerHTML = enabled
      ? '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="2.5" height="10" rx="1"/><rect x="9.5" y="3" width="2.5" height="10" rx="1"/></svg>'
      : '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.2a.6.6 0 0 1 .9-.5l7.2 4.8a.6.6 0 0 1 0 1l-7.2 4.8a.6.6 0 0 1-.9-.5z"/></svg>'
  }
  const onClick = () => menuMotionPreference.setEnabled(!menuMotionPreference.enabled)
  button.addEventListener('click', onClick)
  overlay.querySelector('.menu-foot')?.append(button)
  const unsubscribe = menuMotionPreference.subscribe(update)
  update()
  return () => { unsubscribe(); button.removeEventListener('click', onClick); button.remove() }
}

if (import.meta.hot) import.meta.hot.dispose(() => { media?.removeEventListener('change', notify); listeners.clear() })
