# Pagina: home — override Nothin' (2026-10-27)

> Override peste MASTER. Valabil doar pentru pagina principală.

- **Referință:** noth.in (verificat live via fetch), Lapa Ninja (font PP Neue Montreal confirmat
  via căutare; pagina Lapa a dat 403, Awwwards neverificat). Fără browser automation —
  animațiile reale Nothin' NU au fost văzute; interacțiunile de aici sunt propuneri proprii.
- **Font:** Archivo (Google Fonts, liber) ca substituent pentru PP Neue Montreal (comercial,
  Pangram Pangram). Un singur grotesc, headings 900 uppercase, tracking negativ.
- **Compoziție:** hero full-viewport cu wordmark gigant (fără etichetă), manifest uriaș, proiecte ca
  rânduri strict tipografice + explore, marquee, FAQ, CTA gigant „Hai să începem de la
  nimic". Fără decorațiuni: utilizatorul a cerut ștergerea tuturor formelor (orbe/pete).
- **Mișcare:** reveal IntersectionObserver, marquee CSS; totul anulat la
  `prefers-reduced-motion`.
- **2026-10-28 (secțiunile 2–3 din brief):** wordmark fluid `clamp(3rem, 16vw, 17rem)` —
  linia „ȚÎGÎRLAȘ" (~5.3em) umple ~90% din lățimea utilă, fără deformări; CTA primar
  mutat spre contact; proiectele rescrise ca rânduri editoriale cu proporții diferite
  (nu grilă de carduri) — fără panouri-gradient, fără badge; stadiul e metadat discret
  „( în lucru )". `imagini/luna.png` e ilustrație dark line-art, incompatibilă cu baza
  albă editorială + cerința de materialitate (crom/folie/gloss) — rămâne nefolosit.
  WebGL omis deliberat: cost nejustificat pentru 2 proiecte.
- **2026-10-28 (secțiunile 4–6):** manifest rescris concret (ce fac + ce aduc, fără promo
  vag); proiecte cu categorie + an (Site personal 2026 / Exercițiu 2026); uneltele ca listă
  tipografică cu separatoare (fără chips); intrare hero CSS pur (`ridicare` 700ms, stagger
  120/240ms — funcționează și fără JS); fără biblioteci de animații — soluție unică
  nativă (CSS + IntersectionObserver + rAF); meniul mută focusul pe prima legătură și
  pune `inert` pe main/footer; `overflow-wrap` pe titlurile gigante. Fără fotografie
  relevantă în proiect — secțiunea Despre rămâne tipografică, fără secțiuni goale.
- **2026-10-28 (secțiunile 7–8):** scară de spațiere în tokeni (`--sp-*`, secțiuni 96/140,
  contact 120/170); tokenii morți `--card`/`--radius` șterși; meta OG + twitter:card
  (fără og:image — niciun asset potrivit); comentarii `<!-- EDITABIL -->` pe fiecare
  secțiune; conținutul rămâne HTML static deliberat (accesibil fără JS, §5) — fără
  dependențe noi, doar `vite` ca devDep. Lint/typecheck indisponibile (fără config în
  proiect); verificate: `node --check`, `vite build`,   preview local HTTP 200.
- **2026-10-28 (verificare browser, Edge+playwright-core):** capturi 1440×1000 și
  390×844 în `docs/capturi/` (ecran, proiecte, meniu, zoom titlu). Zero erori consolă,
  zero overflow, Archivo 900 + latin-ext confirmate, meniu rapid, linkuri + mailto OK.
  Din comparația cu screenshot-ul Nothin': orbul argintiu mutat de pe glife, aer peste
  circumflexe, orbe repoziționate, meta ascuns ≤560px, fallback `<noscript>`.
  Diacriticele triunghiulare + punctul pătrat sunt desenul real Archivo Black (verificat
  `document.fonts.check` pe ȚȘÎÂ), nu bug. Captura live noth.in a rămas la preloader —
  comparația se sprijină pe screenshot-ul furnizat de utilizator.
- **2026-10-28 (neon liquid, referință mockup):** `public/references/neon-target.png`
  lipsește din proiect — referința e imaginea atașată. Sistem `NeonBlob` vanilla
  (defs SVG + `use`, fără biblioteci): 8 siluete, 16 forme hero + 4 la contact,
  paletă #145BFF/#0828B9/#00EFFF/#FF36E8/#842BFF/#3B0C91, rim cyan/magenta,
  specular, bloom, parallax cursor (pointer:fine, lerp rAF), dark mode cu glow
  întărit. Scenele proiectelor trecute pe gradiente neon. Capturi: `neon-1440/1280/
  768/390-ecran.png` + `neon-1440-dark.png` + `neon-contact.png` — zero erori,
  zero overflow, conținut neacoperit (corecții: 1280 counter, tabletă CTA, contact).
- **2026-10-28 (cerc perfect roz):** haloul roz din afara conturului venea din `blur` +
  raza ovală: `blur` eliminat (păstrat `saturate`), `orb-crema` și scena roz readuse la
  `border-radius: 50%`. Verificat cu zoom 2x: cerc curat, fără roz în afară.
- **2026-10-28 (inel + tăiere scenă):** linia albă era inelul decorativ (limitat la 300px,
  mai mic decât bila) — șters complet; tăierile drepte veneau din scena prea scundă
  (bila 305px > scenă 300px): plafonul scenei mici ridicat la 360px. Bila roz acum
  identică cu cea albastră.
- **2026-10-28 (neon peste tot):** câmpuri `NeonBlob` în manifest/proiecte/despre/unelte/
  faq/footer/contact (site-ul e one-page, fără rute extra și fără secțiune
  Experience); sferele proiectelor → siluete lichide nbL1/nbL2 cu morph SMIL
  (14s/17s, pauză offscreen + reduced-motion), aceleași dimensiuni, rim clar fără
  blur pe obiect. Capturi:   `ext-hero/proiecte/mobil/pagina.png` — zero erori,
  zero overflow, texte neacoperite.
- **2026-10-28 (densitate + strat global):** 66 bloburi (hero 16, manifest 9,
  proiecte 10, despre 7, unelte 6, faq 5, contact 10, footer 3), mutate de JS în
  `#neon-global` cu coordonate de document (măsurate din secțiuni, recalculate la
  resize/reflow); fără JS rămân în secțiuni. Animațiile plutire se opresc
  offscreen (IO). Incident: un `replaceAll` a corupt `pan class=` în `<s<span`
  pe toate span-urile — reparat, lecție: fără replaceAll pe fragmente HTML.
  Capturi:   `dens-pagina/mobil.png` — densitate continuă, morph confirmat live.
- **2026-10-28 (re-verificare familii):** implementarea exista deja din ture anterioare;
  verificat integral acum: preview 3×2, pagină întreagă, dark, mobil — zero erori,
  zero suprapuneri, layout intact.
- **2026-10-28 (numerotări + T + butoane):** șterse cele 6 etichete decorative
  (section-index + kicker), păstrate meta proiectele; T cu tijă ~30% mai subțire;
  meniu completat (Acasă + Întrebări, id faq, outside-click, panou alb/negru pe
  teme, stagger 6 linkuri); `prefers-color-scheme` la prima vizită; scroll-margin
  96px. Capturi: `fix-meniu-light/dark/mobil.png`, `fix-hero.png`.
- **2026-10-28 (bloburi distincte + T neon):** nbL1 lat cu prelungire curbată (albastru),
  nbL2 înalt cu 5–6 lobi (magenta), morph propriu; eticheta hero ștearsă; logo header
  nou: T lichid din aceleași straturi neon (38px desktop / 32px mobil).
- **2026-10-28 (picături mărite):** toate bloburile mici ~3x (20–26px → 60–78px),
  cu repoziționări unde acopereau text; mobil 34px; footer fără bloburi (zero
  spațiu liber). Incident: captură falsă de la server vechi blocat pe port —
  lecție: omoară procesele node reziduale înainte de verificare. Capturi:
  `mari-1440-ecran/pagina.png`, `final-1440.png` — sondă elementFromPoint:
  textul e deasupra peste tot.
- **2026-10-28 (rafinare hero):** compoziția exista deja (eyebrow, copy nou, CTA);
  mutat blobul de pe „Ț" afară din text; ascuns blobul bottom-center pe mobil
  (ieșea de sub buton). Capturi desktop + mobil verificate.
- **2026-10-28 (etichetă hero):** readăugat `.hero-counter` cu textul nou
  „( 000 ) — Învață, creează, experimentează.”; restul paginii neschimbat
  (navbar, titlu cu punct albastru, CTA-uri, secțiuni existente).
- **2026-10-28 (liquid chrome shader):** `src/liquid.js` (fbm domain-warp, benzi
  crom, iridescență, fresnel, morph în vertex shader) + `src/blob3d.js` (2 bloburi
  proiect realtime, fallback still); 12 stills re-randate cu shaderul
  (`public/neon/`, vechiul env-chrome înlocuit); logo T rămâne vector.
  Capturi comparative light/dark/pagină/mobil — zero erori.
- **2026-10-28 (rollout 3D complet):** 14 WebP transparente randate offline din
  aceleași geometrii/materiale/env (`public/neon/`, total ~140KB, `loading=lazy`,
  dimensiuni declarate); toate cele 66 instanțe SVG → `<img>`, defs curățate;
  hero rămâne WebGL realtime + fallback stills; bloburile proiectelor cu plutire
  CSS (în locul morph SMIL); manifest TL micșorat ca să nu atingă titlul.
- **2026-10-28 (prototip WebGL):** `three@0.186` + `src/neon3d.js` (import dinamic,
  chunk separat 538KB): 3 bloburi crom lichid în hero (icosaedru deformat, normale
  netede via mergeVertices, MeshPhysicalMaterial metal+clearcoat, mediu HDR custom
  cu dungi albe/cyan/magenta, ACES), parallax cursor, pauză offscreen, fallback
  SVG automat.   Captură: `webgl-prototip.png` — reflexii curbe reale, compoziție
  curată. Pas următor propus: stills WebP pentru bloburile mici (opțional).
- **2026-10-28 (rollback la neon SVG):** fără commit Git disponibil pentru sesiune
  (istoricul are doar comituri vechi) — restaurare țintită din `index-pre-webp.html`:
  66 instanțe SVG + defs streak verificate 1:1; șterse three/WebGL (JS/CSS/div-urile/
  `src/neon3d|blob3d|liquid.js`, `public/neon/`, dependența; morph SMIL înapoi).
  Păstrate: texte, meniu 6 linkuri, teme, T slim, fără numere/divizoare. Backup
  stare anterioară în Temp. Capturi: `back-hero/proiecte/dark/mobil.png`.
- **2026-10-28 (familiile 030/070/120/157/078/085):** fără PNG-uri licențiate în
  proiect, Behance 403, samolevsky.com accesat (copertă + descrieri: sticlă
  închisă, curcubeu, granulație) — planșele cu iteme numerotate nu sunt publice,
  deci reconstrucție originală din descrieri (NU copie exactă): cluster fuzionat,
  poros, nod TorusKnot cu găuri reale, solid, stea-7, stea-4; material dark glass
  + spectru curcubeu + granulație în shader; preview 3×2 validat vizual; rollout
  complet (hero realtime + 14 stills + proiecte).
- **2026-10-28 (reconstrucție fidelă referință):** căile `public/references/` +
  Behance (403) indisponibile — autoritate: mockup-ul furnizat. Hero WebGL trecut
  pe sticlă luminoasă (fără crom negru), 14 stills re-randate glass, repoziționări
  colțuri la 1686px. Capturi: `ref-1686/1920.png`, dark, mobil.
- **2026-10-28 (asset izolat):** `public/neon/blob-glass-1k.png` — blob cobalt
  1024px, alpha verificat (colțuri 0, centru opac), fără puncte/fundal; uniformă
  nouă `uGlass` în shader pentru varianta sticlă luminoasă.
- **2026-10-28 (3D responsiv):** bloburile WebGL își calculează poziția/scala din
  fracțiuni de hero (oglindă fallback SVG) la orice viewport; canvas 130% pentru
  bleed sub hero. Verificat la 1686×896 (mărimea referinței): fără suprapuneri.
- **2026-10-28 (liquid glass realist):** stratificare premium pe toate bloburile —
  umbră dublă, rim de bază + arcade cyan/magenta (`pathLength`, fără blur),
  dâre speculare curbe pe contur (12 path-uri proprii, fără puncte albe), nucleu
  luminos; logo T cu dâre (redesenat să citească T, nu pin). Regenerare via
  script determinist cu backup. Capturi comparative light/dark + pagină + mobil.
- **2026-10-28 (glow subtil):** opacități ×0.7 + blur ×1.3 la toate drop-shadow-urile
  (inclusiv logo și dark mode); rim/specular/gradiente intacte. Plus fix: blobul mare
  de traversare manifest intrase peste descriere — mutat sub ea, continuitatea păstrată.
- **2026-10-28 (canvas continuu):** în loc de un strat global rescris, secțiunile au
  rămas fără fundaluri proprii iar `overflow:clip` a devenit `overflow-x:clip` —
  bloburile existente trec fizic granițele; câte un blob de traversare
  (`.nb-trav`) per graniță: hero→manifest, manifest→proiecte, proiecte→despre
  (peste banda neagră marquee, asumată ca ruptură intenționată), despre→unelte,
  unelte→faq, faq→contact, contact→footer. Captură pagină întreagă verificată.
- **2026-10-28 (temă în meniu):** buton `tema-meniu` în overlay, sincronizat cu headerul
  (etichete + iconițe ambele sensuri), meniul rămâne deschis la comutare. Capturi:
  `tema-meniu-dark/light/mobil.png`. Diagnostic butoane: codul era corect dinainte
  (verificat repetat); cauza probabilă la utilizator e deschiderea via `file://`
  (module ES blocate) — rulează `npm run dev`.
- **2026-10-28 (fără divizoare):** șterse borderurile de graniță hero/manifest/
  proiecte/despre/unelte/faq/footer + marquee; păstrate chrome navbar/meniu,
  rândurile de listă și underline-ul de link. Captură pagină întreagă verificată.
- **2026-10-28 (dovadă buton temă):** audit pointer-events/z-index/id-uri curat;
  adăugat feedback la apăsare (`:active` scale) + `aria-pressed` sincronizat.
  Măsurat live: light `#FAFAF8`+soare → click → dark `#0a0a0c`+lună → click →
  light, zero erori. Captură: `buton-dupa-click.png` (dark complet).
