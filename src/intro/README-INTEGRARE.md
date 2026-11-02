# IntroExperience — integrare dupa munca lui Codex

Implementare izolata pe branch-ul **`feature/bubble-intro`** (worktree separat,
fara atingerea directorului lui Codex). Tot codul intro-ului sta in
`portofoliu/src/intro/` — **niciun fisier din portofoliu nu a fost rescris**,
doar doua extensii marcate `INTRO-BUBBLE`.

## Fisiere create (doar in `src/intro/` + `intro.html`)

| Fisier | Rol |
|---|---|
| `intro-experience.js` | orchestrator + `initIntroExperience({ onComplete, preload })` |
| `intro-overlay.js` | DOM izolat (prefix `intro-`), `lockPage/unlockPage` |
| `intro.css` | stiluri overlay/legenda, teme, responsive, `prefers-reduced-motion` |
| `intro-material.js` | ADAPTER: glass Codex + injectie de ruptura (fara editarea vendorului) |
| `intro-fragments.js` | cioburi-membrana glass + microdropleturi, fade via `uIntroFade` |
| `codex/glass-material.js` | VENDOR: `createGlassMaterial` (thin-film glass), copie read-only |
| `codex/studio.js` | VENDOR: `createStudioEnvironment` (PMREM cu arce), copie read-only |
| `codex/geometry.js` | VENDOR: cache geometrii + preseturi, copie read-only |
| `codex/blob-geometrie.js` | VENDOR: generator blob organic, copie read-only |
| `codex/shape-presets.js` | VENDOR: preseturi lichide (`bean`, `double`...), copie read-only |
| `codex/surface-differentials.js` | VENDOR: atribut `aCurvature`, copie read-only |
| `codex/topology-config.js` | VENDOR: niveluri teselare, copie read-only |
| `codex/individuality.js` | VENDOR: profiluri sculpt + esantionare miscare, copie read-only |
| `preview.js` | preview izolat (nu atinge portofoliul) |
| `intro.html` (radacina) | pagina de test: `vite --open intro.html` |

## Reutilizarea sistemului Codex (implementat)

Bula intro NU e un design propriu: foloseste EXACT `createGlassMaterial`
(thin-film interference pe lungimi de unda, refractie cu dispersie, softboxuri
anizotrope, Fresnel fizic, opacitate calculata), geometria organica `bean`,
profilul de sculpt + esantionarea miscarii, mediul studio PMREM si absenta tone
mapping-ului — toate vendorizate in `src/intro/codex/` ca **copii read-only**
din `portofoliu-experimental-2/src/holographic/` (sistemul glass Codex).
Ruptura se injecteaza in adapter peste shaderele verbatim, cu uniforme proprii
(`uHitDir/uDent/uWave/uRupture/uIntroFade`); la valori neutre randarea e
bit-identica cu bulele portofoliului. La integrare: re-sincronizeaza cele 8
fisiere `codex/*` cu versiunea finala Codex sau inlocuieste-le cu import partajat.

## Cauza reala a bulei "invizibile" (rezolvata, verificata vizual)

Simptom (versiuni vechi): bula randata doar ca muchie subtire + haloul CSS.
Cauza NU era materialul, ci **camera in interiorul sferei**: camera ortografica
la `z=10` cu `near=0.1/far=50`, in timp ce bula are raza 104-188 centrata la
`z≈0`. Fix: camera in afara volumului (ex: `z=5000, near=1, far=10000` ca in
scene.js Codex). Verificare vizuala reala (Edge headless + SwiftShader):
idle dark/light, ruptura la ~200/500/800ms, reveal complet, pagina principala.

## Cum functioneaza ruptura membranei (fazele A–D, total ~1.15s)

Nu e scalare/opacitate globala, ci ruptura procedurala in shaderul glass:

- **Faza A (~150ms)** — `uDent` adanceste membrana in jurul directiei atingerii
  (`uHitDir` din raycast real); `uWave` propaga un inel de presiune;
  `touchSquash()` comprima usor.
- **Faza B (~150→500ms)** — `uRupture 0→1` deschide o gaura dintata
  (zgomot pe directia obiect) din punctul atins; `discard` decupeaza membrana,
  buza se curbeaza. La `uRupture=1` bula si-a pierdut fizic suprafata continua.
- **Faza C (~350→900ms)** — 16 calote glass + 26 microdropleturi aditive
  zboara spre exterior cu frecare + gravitatie subtila, fade `uIntroFade`.
- **Faza D (~550→1100ms)** — `clip-path: circle()` radial din punctul atingerii
  dezvaluie portofoliul. `prefers-reduced-motion` → fade de 150ms.

## Fisiere partajate atinse (minim, marcate `INTRO-BUBBLE`)

1. `portofoliu/src/main.js` — importul `bule.js` mutat in `pornesteBule()`,
   pornit din `onComplete`; `preload` incalzeste modulul 3D. `?no-intro` sare poarta.
2. `portofoliu/vite.config.js` — intrare suplimentara `intro: intro.html`
   pentru preview; bundle-ul `index.html` neschimbat.

`index.html`, Hero, shaderele portofoliului: **neatinse**.

## Integrare dupa Codex (pasi)

1. Copiaza **doar** `portofoliu/src/intro/` + `portofoliu/intro.html`.
2. Re-sincronizeaza `portofoliu/src/intro/codex/*` cu versiunea finala Codex
   sau inlocuieste-le cu import partajat daca structura permite.
3. Pastreaza blocul `INTRO-BUBBLE` din `main.js`; inlocuieste corpul lui
   `pornesteBule()` cu noul initializator si `preload`-ul cu importul noului
   modul 3D (post-merge: modulul glass + geometriile sunt deja incalzite de intro).
4. Test: `npm run build`, `vite --open intro.html` (click/hover/tactil/Enter,
   teme light/dark, mobil, `?no-intro`, reduced-motion), apoi pagina principala.

## Performanta

- Un singur context WebGL pentru intro, distrus la final (`dispose` +
  `forceContextLoss`); geometrie bean + 16 cioburi + 1 Points.
- Fara pasă de transmission (glass-ul esantioneaza direct textura de mediu).
- Modulul greu (`three` + preseturi) e preincarcat in fundal in timpul intro-ului.
- Fallback fara WebGL: intrare directa, fara blocaj.
- Serverul de dev al portofoliului principal (D:/Lucrari, :5177) a fost folosit
  DOAR pentru citirea randarii de referinta; niciun fisier nu a fost modificat.
