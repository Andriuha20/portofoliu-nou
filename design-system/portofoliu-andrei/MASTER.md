# MASTER — Portofoliu Andrei (Portfolio/Personal)

> Sursă: citiri directe din `ui-ux-pro-max/data/` (products.csv #11, ui-reasoning.csv #11,
> colors.csv #11, typography.csv #44, landing.csv #26, styles.csv #1 Minimalism & Swiss Style
> + #15 Motion-Driven). Tool-ul `search.py --design-system` NU a putut rula (fără Python
> în mediu), deci sinteza de mai jos este fallback verificat manual, nu output JSON al tool-ului.

## 1. Direcție produs
- **Tip:** Portfolio/Personal — creative, personal, showcase work.
- **Considerent cheie (products.csv):** Showcase work. Personality shine through.
- **Landing pattern (landing.csv #26 Portfolio Grid):** Hero (Name/Role) > Project Grid > About/Philosophy > Contact. CTA: Project Card Hover + Footer Contact.
- **Optimizare conversie:** visuals first, filter by category, fast loading essential.

## 2. Stil
- **Primar:** Motion-Driven + Minimalism & Swiss Style.
- **Secundar (doar accente):** Brutalism, Aurora UI.
- **Reguli:**
  - Fundal neutru, lasă lucrul să strălucească. Fără mixing random flat + skeuomorphic.
  - Efecte aliniate cu stilul: glass subtil OK, dar o singură scară de elevation/shadow.
  - Un singur CTA primar per ecran; secundare subordonate vizual.
  - Iconițe SVG consistente (o singură familie, stroke 1.5–2px), NU emoji ca iconițe.

## 3. Culori (tokens semantice, nu hex brut în componente)
Bază verificată colors.csv #11 „Monochrome + blue accent” + adaptare neon existentă:

```css
:root {
  --color-primary: #18181B; --color-on-primary: #FFFFFF;
  --color-secondary: #3F3F46; --color-on-secondary: #FFFFFF;
  --color-accent: #2563EB; --color-on-accent: #FFFFFF;
  --color-background: #FAFAFA; --color-foreground: #09090B;
  --color-card: #FFFFFF; --color-card-foreground: #09090B;
  --color-muted: #E8ECF0; --color-muted-foreground: #475569;
  --color-border: #E4E4E7;
  --color-destructive: #DC2626; --color-on-destructive: #FFFFFF;
  --color-ring: #18181B;
  /* dark (actualul #05070e păstrat, verificat separat contrastul) */
}
[data-theme="dark"] {
  --color-background: #05070e; --color-foreground: #FFFFFF;
  --color-card: #0d0d18; --color-border: #262633;
  --color-accent: #38bdf8; /* neon cyan pentru dark, 4.5:1 pe #05070e */
  --color-muted-foreground: #B6BFD0; /* NU #9ca3af — prea slab pe dark */
}
```

- Proiectează light/dark împreună (`dark-mode-pairing`), testează contrastul separat.
- Text normal ≥4.5:1, text mare ≥3:1. Nu transmite info doar prin culoare.

## 4. Tipografie
- **Recomandat (typography.csv #44 Minimalist Portfolio):** Headings `Space Grotesk`, Body `Archivo`.
- **Actual:** Headings Space Grotesk (bine, păstrează), Body Poppins (rotund, mai puțin editorial — migrează spre Archivo/Inter când poți).
- Scară: 12/14/16/18/24/32; body min 16px, line-height 1.5–1.75, max 65–75ch (curent 70ch OK).
- Weight: headings 600–700, body 400, labels 500.
- `font-display: swap`, preload doar fontul critic.

## 5. Layout & Responsive
- Mobile-first, breakpoints sistematici: 375 / 768 / 1024 / 1440 (actual doar 480px — adaugă 768+1024).
- Container consistent max 960px (actual OK), `width=device-width, initial-scale=1`, niciodată disable zoom.
- Fără scroll orizontal; spacing 4/8pt; z-index scale 0/10/20/40/100/1000.
- Hero actual `margin-left: max(...)` + `overflow-x:hidden` maschează problema — centralizează cu `margin: 0 auto`.

## 6. Mișcare
- Din reasoning #11: Parallax 3–5 layere + scroll-triggered reveals, dar `if_minimal_portfolio: reduce-motion`.
- Tokenuri: enter 300–400ms decelerare, exit ~60–70% din enter, hover 200–250ms.
- Doar transform/opacity, niciodată width/height/top/left. Max 1–2 elemente animate per view.
- Obligatoriu `prefers-reduced-motion` — lipsește acum.

## 7. Accesibilitate (CRITICAL, quick-reference §1)
- Contrast, focus vizibil 2–4px (actual 3px OK), skip-link, ierarhie h1→h6, label `for`, alt text.
- `focus-not-obscured`: header sticky să nu acopere focusul.
- Touch: min 44×44px + gap 8px; feedback <100ms; nu doar hover.

## 8. Anti-patterns de evitat
- Emoji ca iconițe (actual ☀️/🌙 la tema-toggle).
- Ținte tactile mici (toggle 6×12px, linkuri nav 4×2px).
- Fundaluri prea transparente în light mode, borduri invizibile pe o temă.
- O singură durată pentru toate tranzițiile; animații care blochează inputul.
- Placeholder-only labels, erori doar sus (când adaugi formular contact).

## 9. Retrieval
1. Citește acest MASTER.
2. Dacă există `pages/<pagina>.md`, override-urile de acolo câștigă.
3. Altfel, aplică exclusiv MASTER.
