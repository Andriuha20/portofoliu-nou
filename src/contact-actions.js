const emailLink = document.querySelector('[data-contact-email]')
const composeLinks = document.querySelectorAll('[data-compose-email]')
const discord = document.querySelector('[data-copy-discord]')
const usernameElement = discord?.querySelector('[data-discord-username]')
const status = document.getElementById('contact-status')
const abort = new AbortController()
const mobile = matchMedia('(max-width: 700px), (hover: none) and (pointer: coarse)')
let feedbackTimer = 0, copying = false

// The existing displayed contact link is the single source of the recipient.
if (emailLink?.getAttribute('href')?.startsWith('mailto:')) {
  const address = decodeURIComponent(emailLink.getAttribute('href').slice(7).split('?')[0])
  const mailto = emailLink.getAttribute('href')
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address)}`
  function setDestination(link, href, newTab) {
    link.href = href
    if (newTab) { link.target = '_blank'; link.rel = 'noopener noreferrer' }
    else { link.removeAttribute('target'); link.removeAttribute('rel') }
  }
  function updateCompose() {
    composeLinks.forEach(link => {
      setDestination(link, mobile.matches ? mailto : gmail, !mobile.matches)
      const label = link === emailLink ? address : 'Scrie-mi'
      link.setAttribute('aria-label', `${label} — ${mobile.matches ? 'compune un email' : 'compune în Gmail (filă nouă)'}`)
    })
  }
  updateCompose()
  mobile.addEventListener('change', updateCompose, { signal: abort.signal })
}

function legacyCopy(text) {
  const previousFocus = document.activeElement
  const field = document.createElement('textarea')
  field.value = text
  field.readOnly = true
  field.tabIndex = -1
  field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
  document.body.append(field)
  field.select(); field.setSelectionRange(0, text.length)
  try { return document.execCommand('copy') }
  finally { field.remove(); previousFocus?.focus({ preventScroll: true }) }
}

if (discord && usernameElement && status) {
  discord.disabled = false
  const icoCopy = discord.querySelector('[data-icon-copy]')
  const icoCheck = discord.querySelector('[data-icon-check]')
  const arataCopiat = (da) => {
    try { discord.classList.toggle('copiat', da) } catch {}
    try {
      if (icoCopy) icoCopy.style.display = da ? 'none' : ''
      if (icoCheck) icoCheck.style.display = da ? '' : 'none'
    } catch {}
  }
  if (icoCheck) { try { icoCheck.style.display = 'none' } catch {} }
  discord.addEventListener('click', async () => {
    if (copying) return
    copying = true
    clearTimeout(feedbackTimer)
    const username = usernameElement.textContent.trim()
    let copied = false
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(username); copied = true }
    } catch {}
    if (!copied) { try { copied = legacyCopy(username) } catch {} }
    if (abort.signal.aborted) return
    if (copied) {
      status.textContent = 'Copiat!'
      arataCopiat(true)
      feedbackTimer = setTimeout(() => { status.textContent = ''; arataCopiat(false) }, 2400)
    } else {
      const selection = window.getSelection(), range = document.createRange()
      range.selectNodeContents(usernameElement)
      selection?.removeAllRanges(); selection?.addRange(range)
      status.textContent = `Copiază manual: ${username}`
    }
    copying = false
  }, { signal: abort.signal })
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  abort.abort()
  clearTimeout(feedbackTimer)
})
