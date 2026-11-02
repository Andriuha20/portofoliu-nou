/* ——— Intro: overlay fullscreen + legendă (IntroOverlay) ———
   Structură DOM independentă de Hero/portofoliu. Toate clasele au prefixul
   `intro-` ca să nu colisioneze cu stilurile existente. */

export function buildIntroOverlay() {
  const root = document.createElement('div')
  root.className = 'intro-overlay'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-labelledby', 'intro-titlu')

  root.innerHTML = `
    <h1 class="intro-vh" id="intro-titlu">Apasă bula pentru a intra în portofoliu</h1>
    <div class="intro-glow" aria-hidden="true"></div>
    <canvas class="intro-canvas" aria-hidden="true"></canvas>
    <button class="intro-cta" type="button" aria-describedby="intro-titlu">
      <span class="intro-cta-undă" aria-hidden="true"></span>
      <span class="intro-cta-text">APASĂ BULA PENTRU A INTRA</span>
    </button>
    <button class="intro-optiune" type="button" hidden></button>`

  const canvas = root.querySelector('.intro-canvas')
  const cta = root.querySelector('.intro-cta')
  const optiune = root.querySelector('.intro-optiune')
  return { root, canvas, cta, optiune }
}

/* Blochează pagina din spate cât e intro-ul activ: fără scroll, conținutul
   devine inert pentru tehnologii asistive, focusul intră pe butonul intro. */
export function lockPage(cta) {
  document.body.classList.add('intro-activ')
  document.querySelectorAll('main, header.site-header, footer.site-footer').forEach((el) => {
    if ('inert' in el) el.inert = true
  })
  if (cta) cta.focus({ preventScroll: true })
}

export function unlockPage() {
  document.body.classList.remove('intro-activ')
  document.querySelectorAll('main, header.site-header, footer.site-footer').forEach((el) => {
    if ('inert' in el) el.inert = false
  })
}
