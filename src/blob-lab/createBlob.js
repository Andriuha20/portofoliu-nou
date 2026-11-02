import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/* ——— Blob organic multi-lobat + material marmorat procedural ———
   GEOMETRIE: icosaedru deformat cu 5 lobi asimetrici (amplitudini
   0.30–0.62, influențe înguste ca silueta să aibă talii vizibile) +
   3 adâncituri concave între lobi + volum anizotrop.
   MATERIAL: MeshPhysicalMaterial extins prin onBeforeCompile:
   FBM cu domain warping în spațiul obiectului (rămâne lipit de suprafață
   la rotație), paletă cobalt/electric/cyan/violet/magenta/alb-nor,
   răspuns Fresnel pe margini (cyan↔magenta + bloom alb subtil).
   Nicio textură externă, niciun dreptunghi desenat, niciun punct alb. */

const LOBI = [
  { axa: new THREE.Vector3(1, 0.05, 0.15).normalize(), amp: 0.62, clar: 2.6 },
  { axa: new THREE.Vector3(-0.7, 0.72, 0.1).normalize(), amp: 0.55, clar: 2.5 },
  { axa: new THREE.Vector3(0.05, -1, 0.2).normalize(), amp: 0.58, clar: 2.7 },
  { axa: new THREE.Vector3(-0.2, 0.05, -1).normalize(), amp: 0.35, clar: 2.2 },
  { axa: new THREE.Vector3(0.65, 0.62, 0.3).normalize(), amp: 0.2, clar: 3.2 },
]

const ADANCITURI = [
  { axa: new THREE.Vector3(0.35, 0.85, 0.2).normalize(), amp: -0.32, clar: 2.8 },
  { axa: new THREE.Vector3(0.75, -0.55, 0.25).normalize(), amp: -0.3, clar: 2.8 },
  { axa: new THREE.Vector3(-0.62, -0.72, 0.3).normalize(), amp: -0.28, clar: 2.8 },
]

const FAZA_VENE = 0.7

export function construiesteGeometrie(detaliu = 64) {
  // IcosahedronGeometry e neindexată (vârfuri duplicate per față) — sudăm
  // vârfurile ÎNAINTE de deformare, ca normalele recalculate să fie netede.
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, detaliu))
  const poz = geo.attributes.position
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  const culori = new Float32Array(poz.count * 3)
  const c = new THREE.Color(0xffffff)
  for (let i = 0; i < poz.count; i++) {
    v.fromBufferAttribute(poz, i)
    n.copy(v).normalize()
    let d = 0
    for (const lob of LOBI) {
      const k = Math.max(0, n.dot(lob.axa))
      d += lob.amp * Math.pow(k, lob.clar)
    }
    for (const ad of ADANCITURI) {
      const k = Math.max(0, n.dot(ad.axa))
      d += ad.amp * Math.pow(k, ad.clar)
    }
    d += 0.028 * Math.sin(n.x * 5.3 + 1.3) * Math.sin(n.y * 4.6 + 0.5) * Math.sin(n.z * 4.9 + 2.1)
    v.multiplyScalar(Math.max(0.55, 1 + d))
    v.x *= 1.28
    v.y *= 0.94
    v.z *= 0.78
    poz.setXYZ(i, v.x, v.y, v.z)
    const m1 = Math.sin(n.x * 2.6 + n.y * 2.2 + 1.7) * 0.5 + 0.5
    const m2 = Math.sin(n.y * 3.7 - n.z * 2.4 + 0.6 + 1.6 * Math.sin(n.x * 2.0)) * 0.5 + 0.5
    const m3 = Math.sin((n.x + n.y + n.z) * 2.4 - 1.2) * 0.5 + 0.5
    c.set(0xffffff)
    c.lerp(new THREE.Color(0x145bff), 0.25 + 0.75 * m1)
    c.lerp(new THREE.Color(0x15259c), 0.55 * m2)
    c.lerp(new THREE.Color(0x742beb), 0.45 * m2 * m2)
    c.lerp(new THREE.Color(0x00efff), 0.5 * m3 * m3)
    c.lerp(new THREE.Color(0xff36e8), 0.45 * m1 * m1 * m2)
    const vena = Math.pow(Math.sin(m1 * 5.0 + m2 * 4.0 + FAZA_VENE) * 0.5 + 0.5, 3)
    c.lerp(new THREE.Color(0xf6f8ff), vena * 0.32)
    culori[i * 3] = Math.min(1, c.r)
    culori[i * 3 + 1] = Math.min(1, c.g)
    culori[i * 3 + 2] = Math.min(1, c.b)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(culori, 3))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

const FRAG_NOISE = [
  'uniform float uInvR;',
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
  'vec3 wp = vObj * uInvR * 2.0;',
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

export function creeazaMaterial(invR) {
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
    envMapIntensity: 1.2,
    specularIntensity: 1,
  })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uInvR = { value: invR }
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
  m.customProgramCacheKey = () => 'blob-marmura-fizic-v1'
  return m
}

export function creeazaMaterialRezerva(tip) {
  if (tip === 'standard') {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: 0xffffff,
      metalness: 0.15,
      roughness: 0.28,
      envMapIntensity: 1.0,
    })
  }
  return new THREE.MeshBasicMaterial({ vertexColors: true })
}

/* View diagnostic (§8): câmpul neted de bază (driverul măștilor), afișat
   grayscale, ca să se verifice vizual absența grilelor/cusăturilor.
   Folosit doar prin ?material=camp, niciodată în producție. */
export function creeazaMaterialCamp(invR) {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uInvR = { value: invR }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_NOISE)
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n' +
          'vec3 wp = vObj * uInvR * 2.0;\n' +
          'vec3 q = vec3(fbmAA(wp * 1.1), fbmAA(wp * 1.1 + vec3(5.2, 1.3, 2.8)), fbmAA(wp * 1.1 + vec3(8.3, 2.6, 6.1)));\n' +
          'float camp = fbm2(wp * 1.15 + q * 0.9);\n' +
          'diffuseColor.rgb = vec3(camp);',
      )
  }
  m.customProgramCacheKey = () => 'blob-camp-v1'
  return m
}

export function creeazaBlob(detaliu = 64) {
  const geo = construiesteGeometrie(detaliu)
  const raza = geo.boundingSphere ? geo.boundingSphere.radius : 1.4
  const mesh = new THREE.Mesh(geo, creeazaMaterial(1 / Math.max(0.5, raza)))
  return mesh
}
