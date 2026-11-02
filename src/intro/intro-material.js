import * as THREE from 'three'
import { createGlassMaterial } from './codex/glass-material.js'

/* ——— Intro: bula = materialul GLASS Codex + ruptură ———
   Folosește EXACT `createGlassMaterial` (thin-film interference, refracție cu
   dispersie, softboxuri anizotrope, Fresnel fizic, opacitate calculată) din
   fișierul vendor NEMODIFICAT. Injecția intro (contact/undă/ruptură/fade) se
   aplică prin mutarea stringurilor shaderului DUPĂ creare, în acest adapter:
   vendorul rămâne verbatim, iar la `uRupture=0 / uIntroFade=1` randarea e
   bit-identică cu bulele portofoliului.
   Opacitatea cioburilor se animează via `uIntroFade` (uniforma proprie),
   nu via `opacity` (shaderul glass nu o citește). */

const GLSL_NOISE = /* glsl */ `
float rupHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float rupNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(rupHash(i), rupHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(rupHash(i + vec3(0.0, 1.0, 0.0)), rupHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(rupHash(i + vec3(0.0, 0.0, 1.0)), rupHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(rupHash(i + vec3(0.0, 1.0, 1.0)), rupHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
`

const VERT_DECL = /* glsl */ `
uniform vec3 uHitDir;
uniform float uDent;
uniform float uWave;
uniform float uRupture;
centroid varying vec3 vRupDir;
varying float vRupDeform;
varying float vRupGlow;
`

const VERT_RUPTURE = /* glsl */ `
{
  vec3 rupDir = normalize(p);
  float angH = acos(clamp(dot(rupDir, uHitDir), -1.0, 1.0));
  float dent = exp(-pow(angH / 0.45, 2.0)) * uDent;
  float ring = exp(-pow((angH - uWave * 1.4) / 0.14, 2.0)) * (1.0 - uWave) * step(0.001, uWave);
  vRupDeform = dent * 0.8 + ring * 0.6;
  p -= rupDir * dent * 0.20;
  p += n * ring * 0.045;
  float edge = uRupture * 3.6;
  float rimD = angH - edge;
  float curl = exp(-pow(rimD / 0.35, 2.0)) * step(0.001, uRupture);
  vRupGlow = exp(-pow(rimD / 0.22, 2.0)) * step(0.001, uRupture);
  p += rupDir * curl * 0.16;
  vRupDir = rupDir;
}
`

const FRAG_DECL = /* glsl */ `
uniform vec3 uHitDir;
uniform float uRupture;
uniform float uIntroFade;
centroid varying vec3 vRupDir;
varying float vRupDeform;
varying float vRupGlow;
`

const FRAG_RUPTURE = /* glsl */ `
vec3 rupD = normalize(vRupDir);
float angF = acos(clamp(dot(rupD, uHitDir), -1.0, 1.0));
float jag = (rupNoise(rupD * 7.0 + uHitDir * 3.0) - 0.5) * 0.55 * step(0.001, uRupture);
float edgeF = uRupture * 3.6 + jag;
// Membrana se rupe procedural din punctul atins — NU fade/scalare.
if (uRupture > 0.0001 && angF < edgeF) discard;
`

/** Aplică injecția intro pe un material glass (bula centrală sau cioburi). */
export function injectRupture(material) {
  material.vertexShader = VERT_DECL + material.vertexShader.replace(
    'vNormal = normalize(normalMatrix * n);',
    `${VERT_RUPTURE}\n    vNormal = normalize(normalMatrix * n);`,
  )
  material.fragmentShader = (FRAG_DECL + GLSL_NOISE) + material.fragmentShader
    .replace(
      'float facing = clamp(N.z, 0.001, 1.0);',
      `${FRAG_RUPTURE}\n    float facing = clamp(N.z, 0.001, 1.0);`,
    )
    .replace(
      '#include <tonemapping_fragment>',
      [
        '// Reactie vizibila la contact: unda lustruieste + buza incandesceaza.',
        'gl_FragColor.rgb += vec3(0.10, 0.35, 0.55) * vRupDeform * 0.9;',
        'gl_FragColor.rgb += vec3(0.85, 0.95, 1.0) * vRupGlow * 0.8;',
        '#include <tonemapping_fragment>',
      ].join('\n'),
    )
    .replace(
      '#include <premultiplied_alpha_fragment>',
      '#include <premultiplied_alpha_fragment>\n    gl_FragColor *= uIntroFade;',
    )
  Object.assign(material.uniforms, {
    uHitDir: { value: new THREE.Vector3(0, 0, 1) },
    uDent: { value: 0 },
    uWave: { value: 0 },
    uRupture: { value: 0 },
    uIntroFade: { value: 1 },
  })
  return material
}

/** Bula centrală: glass Codex + ruptură. Restul uniformelor (uTime, uDark,
 *  uPhase, sculpt, waves...) se setează din orchestrator, ca în scene.js. */
export function createIntroBubbleMaterial(environment) {
  const material = createGlassMaterial(environment)
  injectRupture(material)
  return { material, uniforms: material.uniforms }
}

/** Cioburi: glass Codex independent (uniforme proprii), cu ruptură inclusă
 *  (inactivă, uRupture=0) și fade via uIntroFade. */
export function createShardMaterial(environment) {
  const material = createGlassMaterial(environment)
  injectRupture(material)
  return material
}
