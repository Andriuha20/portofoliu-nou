import * as THREE from 'three'

/* Material marmorat partajat — ACEEAȘI arhitectură ca prototipul aprobat
   (MeshPhysicalMaterial + onBeforeCompile: FBM cu domain warping în
   spațiul obiectului, paletă cobalt/electric/cyan/violet/magenta/alb-nor,
   Fresnel cyan↔magenta). Singura diferență: uniforma uSeed decalează
   câmpul de zgomot per obiect, ca fiecare blob să aibă marmorat propriu
   în aceeași familie vizuală. Codul shader e identic pentru toate cele 6
   materiale → același program GPU (program cache comun). */

const FRAG_NOISE = [
  'uniform float uInvR;',
  'uniform vec3 uSeed;',
  'uniform vec3 uDeep;',
  'uniform vec3 uElec;',
  'uniform vec3 uCy;',
  'uniform vec3 uVi;',
  'uniform vec3 uMa;',
  'uniform vec3 uAlb;',
  'varying vec3 vObj;',
  'float h31(vec3 p){ vec3 p3 = fract(p * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
  'float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
  'float n000 = h31(i); float n100 = h31(i + vec3(1.0, 0.0, 0.0));',
  'float n010 = h31(i + vec3(0.0, 1.0, 0.0)); float n110 = h31(i + vec3(1.0, 1.0, 0.0));',
  'float n001 = h31(i + vec3(0.0, 0.0, 1.0)); float n101 = h31(i + vec3(1.0, 0.0, 1.0));',
  'float n011 = h31(i + vec3(0.0, 1.0, 1.0)); float n111 = h31(i + vec3(1.0, 1.0, 1.0));',
  'return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z); }',
  'float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int k = 0; k < 4; k++) { v += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return v; }',
  'float fbmAA(vec3 p){ float v = 0.0; float a = 0.5; float f = 1.0; float fw = fwidth(p.x) + fwidth(p.y) + fwidth(p.z); for (int k = 0; k < 4; k++) { float att = clamp(1.0 - fw * f * 0.9, 0.15, 1.0); v += a * att * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); f *= 2.03; a *= 0.5; } return v; }',
  'float fbm3(vec3 p){ float v = 0.0; float a = 0.5; float f = 1.0; float fw = fwidth(p.x) + fwidth(p.y) + fwidth(p.z); for (int k = 0; k < 3; k++) { float att = clamp(1.0 - fw * f * 0.9, 0.15, 1.0); v += a * att * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); f *= 2.03; a *= 0.5; } return v; }',
  'float fbm2(vec3 p){ float fw = fwidth(p.x) + fwidth(p.y) + fwidth(p.z); float att = clamp(1.0 - fw * 2.03 * 1.2, 0.0, 1.0); return (0.55 * vnoise(p) + 0.32 * att * vnoise(p * 2.03 + vec3(1.7, 9.2, 3.1))) / 0.87; }',
].join('\n')

const FRAG_MARMURA = [
  'vec3 wp = (vObj + uSeed) * uInvR * 2.0;',
  'vec3 q = vec3(fbmAA(wp * 1.1), fbmAA(wp * 1.1 + vec3(5.2, 1.3, 2.8)), fbmAA(wp * 1.1 + vec3(8.3, 2.6, 6.1)));',
  'float camp = fbm2(wp * 1.15 + q * 0.9);',
  'vec3 baza = mix(uDeep, uElec, smoothstep(0.3, 0.7, camp));',
  'baza = mix(baza, uVi, smoothstep(0.45, 0.8, fbm2(wp * 1.3 + q * 0.7)) * 0.7);',
  'baza = mix(baza, uCy, smoothstep(0.5, 0.85, camp) * smoothstep(0.35, 0.65, q.y) * 0.8);',
  'baza = mix(baza, uMa, smoothstep(0.55, 0.9, camp + q.x * 0.2) * 0.6);',
  'float det = fbm3(wp * 2.3 + q * 1.2) - 0.45;',
  'baza *= 1.0 + det * 0.35;',
  'float nori = smoothstep(0.55, 0.95, fbm3(wp * 1.8 + q) + det * 0.4);',
  'baza = mix(baza, uAlb, clamp(nori, 0.0, 1.0) * 0.45);',
  'diffuseColor.rgb = baza;',
].join('\n')

const FRAG_FRESNEL = [
  '{',
  ' vec3 dirV = normalize(vViewPosition);',
  ' float fr = 1.0 - clamp(dot(normalize(normal), dirV), 0.0, 1.0);',
  ' float fr2 = fr * fr;',
  ' vec3 marg = mix(uCy, uMa, 0.5 + 0.5 * sin(atan(vObj.y, vObj.x) * 3.0));',
  ' gl_FragColor.rgb += marg * fr2 * 0.55;',
  ' gl_FragColor.rgb += vec3(1.0) * fr * fr * fr * fr * 0.30;',
  '}',
].join('\n')

export function createMarbledBlobMaterial(invR, seedOffset) {
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: false,
    color: 0xffffff,
    metalness: 0,
    roughness: 0.06,
    transmission: 1.0,
    thickness: 1.0,
    ior: 1.42,
    attenuationColor: new THREE.Color(0x2f6bff),
    attenuationDistance: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.7,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 650],
    envMapIntensity: 1.15,
    specularIntensity: 1,
  })
  const seed = new THREE.Vector3(seedOffset[0], seedOffset[1], seedOffset[2])
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uInvR = { value: invR }
    shader.uniforms.uSeed = { value: seed }
    shader.uniforms.uDeep = { value: new THREE.Color(0x10269f) }
    shader.uniforms.uElec = { value: new THREE.Color(0x145bff) }
    shader.uniforms.uCy = { value: new THREE.Color(0x00efff) }
    shader.uniforms.uVi = { value: new THREE.Color(0x742beb) }
    shader.uniforms.uMa = { value: new THREE.Color(0xff36e8) }
    shader.uniforms.uAlb = { value: new THREE.Color(0xf6f8ff) }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_MARMURA)
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n' + FRAG_FRESNEL)
  }
  // Cod shader identic pentru toate cele 6 materiale → program GPU comun.
  m.customProgramCacheKey = () => 'blob-marmura-fizic-v1'
  return m
}

export const SEEDURI_MARMURA = [
  [0, 0, 0],
  [1.7, 0.6, -1.2],
  [-1.3, 1.8, 0.9],
  [2.1, -1.1, 1.4],
  [-0.8, -2.0, 1.6],
  [1.1, 2.2, -1.9],
  [2.3, -1.4, 0.7],
]
