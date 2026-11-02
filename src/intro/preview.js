import '../style.css'
import { initIntroExperience } from './intro-experience.js'

/* Preview izolat al intro-ului (rulare: `vite --open intro.html`).
   NU atinge portofoliul real; demo-ul din spate simulează reveal-ul. */

const demo = document.getElementById('demo-portofoliu')

const stilDemo = document.createElement('style')
stilDemo.textContent = `
  #demo-portofoliu { min-height: 100svh; display: grid; place-content: center; gap: 12px;
    text-align: center; padding: 40px 20px; }
  #demo-portofoliu[hidden] { display: none; }
  .demo-eticheta { font-size: .75rem; letter-spacing: .2em; color: var(--muted); margin: 0; }
  .demo-titlu { font-size: clamp(2.4rem, 9vw, 6rem); margin: 0; letter-spacing: -.03em; }
  .demo-sub { color: var(--muted); margin: 0; }
  .demo-actiuni { display: flex; gap: 12px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
  .demo-actiuni button { min-height: 48px; padding: 12px 26px; border-radius: 999px;
    border: 1px solid var(--ink); background: var(--ink); color: var(--bg);
    font: inherit; font-weight: 700; cursor: pointer; }
`
document.head.appendChild(stilDemo)

function comutaTema() {
  const root = document.documentElement
  const tema = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  root.setAttribute('data-theme', tema)
  try {
    localStorage.setItem('tema', tema)
  } catch (e) {}
}

function joaca() {
  demo.hidden = true
  initIntroExperience({
    onComplete: () => {
      demo.hidden = false
    },
  })
}

document.getElementById('demo-replay').addEventListener('click', joaca)
document.getElementById('demo-tema').addEventListener('click', comutaTema)

joaca()
