/* VENDOR (read-only, feature/bubble-intro): copie din portofoliu-experimental-2/src/holographic/ (sistemul glass Codex). NU edita aici: la integrare se re-sincronizeaza cu versiunea finala Codex sau se inlocuieste cu import partajat. */
import { Matrix3, ShaderMaterial, Vector3, Vector4 } from 'three'

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uMotion;
  uniform float uHover;
  uniform float uOffsetScale;
  uniform vec3 uOptics;
  uniform vec4 uWave1;
  uniform vec4 uWave2;
  uniform vec4 uWave3;
  uniform vec3 uWaveRates;
  uniform float uDeformGain;
  uniform mat3 uSculptFrame;
  uniform vec4 uSculptA;
  uniform vec4 uSculptB;
  uniform vec3 uSculptCenter;
  uniform float uSculptScale;
  uniform vec3 uBreath;
  attribute vec3 aCurvature;
  centroid varying vec3 vNormal;
  centroid varying vec3 vLocal;
  void main() {
    vec3 p = position;
    vec3 k1 = uWave1.xyz;
    vec3 k2 = uWave2.xyz;
    vec3 k3 = uWave3.xyz;
    float a = dot(p, k1) + uTime * uWaveRates.x + uWave1.w;
    float b = dot(p, k2) + uTime * uWaveRates.y + uWave2.w;
    float c = dot(p, k3) + uTime * uWaveRates.z + uWave3.w;
    // Unique static distortion remains when reduced motion is requested.
    float amount = (0.014 + 0.016 * uMotion + 0.012 * uHover) * uOptics.y * uOffsetScale * uDeformGain;
    float displacement = (0.65 * sin(a) + 0.25 * sin(b) + 0.10 * sin(c)) * amount;
    vec3 gradient = (0.65 * k1 * cos(a) + 0.25 * k2 * cos(b) + 0.10 * k3 * cos(c)) * amount;
    vec3 tangent = normalize(cross(abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), normal));
    vec3 bitangent = cross(normal, tangent);
    vec2 slope = vec2(dot(gradient, tangent), dot(gradient, bitangent));
    // For P' = P + h N, the displaced normal uses (I + h dN/dP)^-1.
    // Curvature is baked once; the GPU needs no extra noise evaluations.
    vec3 shape = vec3(1.0, 0.0, 1.0) + displacement * aCurvature;
    float determinant = max(shape.x * shape.z - shape.y * shape.y, 0.01);
    vec2 correctedSlope = vec2(shape.z * slope.x - shape.y * slope.y,
      shape.x * slope.y - shape.y * slope.x) / determinant;
    vec3 n = normalize(normal - tangent * correctedSlope.x - bitangent * correctedSlope.y);
    p += normal * displacement;
    // Each stable ID has its own bulge locations, neck widths, strengths and
    // sculpting frame. Transform the normal with the exact inverse Jacobian
    // of this smooth, positive-cross-section map, including local breathing.
    vec3 q = transpose(uSculptFrame) * p;
    vec3 nq = transpose(uSculptFrame) * n;
    float d1 = q.y - uSculptA.x, d2 = q.y - uSculptB.x;
    float g1 = exp(-uSculptA.y * d1 * d1), g2 = exp(-uSculptB.y * d2 * d2);
    float dg1 = -2.0 * uSculptA.y * d1 * g1, dg2 = -2.0 * uSculptB.y * d2 * g2;
    float breath = uMotion * uBreath.z * sin(uTime * uBreath.x + uBreath.y);
    float bulge = uSculptA.z + breath;
    float sx = 1.0 + bulge * g1 - uSculptB.z * g2;
    float sz = 1.0 + bulge * 0.65 * g2 - uSculptB.z * 0.45 * g1;
    float jxy = q.x * (bulge * dg1 - uSculptB.z * dg2) + uSculptA.w * dg2;
    float jzy = q.z * (bulge * 0.65 * dg2 - uSculptB.z * 0.45 * dg1) + uSculptB.w * dg1;
    float jyy = 1.0 + 1.2 * uSculptA.w * dg1 - 0.9 * uSculptB.w * dg2;
    vec3 warpedNormal = vec3(nq.x / sx, (nq.y - jxy * nq.x / sx - jzy * nq.z / sz) / jyy, nq.z / sz);
    q = vec3(q.x * sx + uSculptA.w * g2, q.y + 1.2 * uSculptA.w * g1 - 0.9 * uSculptB.w * g2, q.z * sz + uSculptB.w * g1);
    p = (uSculptFrame * q - uSculptCenter) * uSculptScale;
    n = normalize(uSculptFrame * warpedNormal);
    vNormal = normalize(normalMatrix * n);
    vLocal = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const fragmentShader = /* glsl */ `
  uniform sampler2D uEnvironment;
  uniform float uPhase;
  uniform float uDark;
  uniform float uDepth;
  uniform mat3 uEnvironmentRotation;
  uniform vec3 uOptics;
  centroid varying vec3 vNormal;
  centroid varying vec3 vLocal;
  const float PI = 3.141592653589793;
  vec3 environment(vec3 direction, float blur) {
    vec3 d = normalize(direction);
    vec2 uv = vec2(atan(d.z, d.x) / (2.0 * PI) + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
    // Differentiate the direction, not wrapped longitude UVs. This keeps the
    // seam continuous while choosing mips from the actual pixel footprint.
    vec3 dx = dFdx(d), dy = dFdy(d);
    float longitudeScale = 1.0 / (2.0 * PI * max(dot(d.xz, d.xz), 0.00001));
    float latitudeScale = inversesqrt(max(1.0 - d.y * d.y, 0.00001)) / PI;
    vec2 uvDx = vec2((d.x * dx.z - d.z * dx.x) * longitudeScale, dx.y * latitudeScale);
    vec2 uvDy = vec2((d.x * dy.z - d.z * dy.x) * longitudeScale, dy.y * latitudeScale);
    vec2 dimensions = vec2(textureSize(uEnvironment, 0));
    float footprint = max(length(uvDx * dimensions), length(uvDy * dimensions));
    float minimumFootprint = exp2(blur);
    float scale = max(1.0, minimumFootprint / max(footprint, 0.00001));
    return textureGrad(uEnvironment, uv, uvDx * scale, uvDy * scale).rgb;
  }
  vec3 compressNeutral(vec3 radiance) {
    float white = min(min(radiance.r, radiance.g), radiance.b);
    return radiance - vec3(white) + vec3(white / (1.0 + white * 1.35));
  }
  vec3 highlightShoulder(vec3 radiance) {
    float peak = max(max(radiance.r, radiance.g), radiance.b);
    float mapped = peak <= 0.75 ? peak : 0.75 + 0.25 * (1.0 - exp(-(peak - 0.75) / 0.25));
    return radiance * (mapped / max(peak, 0.001));
  }
  float softbox(vec3 ray, vec3 axis, vec3 tangent, vec2 size) {
    vec3 bitangent = normalize(cross(axis, tangent));
    vec2 p = vec2(dot(ray, tangent), dot(ray, bitangent)) / size;
    // Integrate a pixel-sized footprint only when the reflected light becomes
    // subpixel. Broad highlights retain their original sharpness and shape.
    vec2 dx = dFdx(p), dy = dFdy(p);
    vec2 variance = (dx * dx + dy * dy) / 12.0;
    vec2 width = sqrt(vec2(1.0) + 4.0 * variance);
    p /= width;
    vec2 p2 = p * p;
    return exp(-dot(p2, p2)) * smoothstep(0.50, 0.80, dot(ray, axis)) / (width.x * width.y);
  }
  void main() {
    vec3 N = normalize(vNormal);
    vec3 I = vec3(0.0, 0.0, -1.0);
    float facing = clamp(N.z, 0.001, 1.0);
    float phase = uPhase * 0.31;
    mat3 turn = uEnvironmentRotation;
    float ior = 1.34;
    float cosT = sqrt(1.0 - (1.0 - facing * facing) / (ior * ior));
    float rs = (facing - ior * cosT) / (facing + ior * cosT);
    float rp = (ior * facing - cosT) / (ior * facing + cosT);
    float fresnel = 0.5 * (rs * rs + rp * rp);
    // Two interfaces in a thin film; optical path changes with the angle
    // and smooth local thickness. RGB wavelengths are expressed in nanometres.
    float thicknessNm = 410.0 + uOptics.x + 85.0 * sin(vLocal.y * 2.2 + vLocal.x * 1.4 + phase)
      + 24.0 * sin(vLocal.z * 3.0 - vLocal.x * 2.4);
    vec3 opticalPhase = 4.0 * PI * ior * thicknessNm * cosT / vec3(650.0, 510.0, 475.0);
    vec3 phaseWidth = fwidth(opticalPhase);
    vec3 filteredCosine = cos(opticalPhase) / (vec3(1.0) + phaseWidth * phaseWidth / 24.0);
    vec3 interference = (2.0 * fresnel * (1.0 - filteredCosine))
      / max(vec3(0.001), 1.0 + fresnel * fresnel - 2.0 * fresnel * filteredCosine);
    float filmPeak = max(max(interference.r, interference.g), interference.b);
    vec3 spectralTint = interference / (filmPeak + 0.025);
    vec3 filmTint = mix(vec3(1.0), clamp(spectralTint + vec3(0.20, 0.16, 0.28), 0.0, 1.0), 0.58);
    vec3 reflection = turn * reflect(I, N);
    vec3 reflected = environment(reflection, 0.35 + uDepth * 2.5);
    float highlight = smoothstep(1.0, 2.3, max(max(reflected.r, reflected.g), reflected.b));
    reflected *= mix(filmTint, vec3(1.0), highlight);
    // Small dispersion, rather than three widely separated coloured shells.
    vec3 through;
    through.r = environment(turn * refract(I, N, 0.742), 1.0 + uDepth * 3.0).r;
    through.g = environment(turn * refract(I, N, 0.746), 1.0 + uDepth * 3.0).g;
    through.b = environment(turn * refract(I, N, 0.751), 1.0 + uDepth * 3.0).b;
    float throughPeak = max(max(through.r, through.g), through.b);
    float throughFloor = min(min(through.r, through.g), through.b);
    float chroma = clamp((throughPeak - throughFloor) / max(throughPeak, 0.01), 0.0, 1.0);
    float clearWindow = (1.0 - smoothstep(0.18, 0.62, chroma)) * smoothstep(0.15, 0.85, facing);
    clearWindow *= 0.82 + 0.18 * sin(vLocal.y * 2.1 + vLocal.x + uOptics.z);
    through = compressNeutral(through);
    vec3 insideNormal = normalize(vec3(-N.xy * 0.72 + vLocal.xy * 0.08, N.z + 0.32));
    vec3 internalLight = environment(turn * reflect(refract(I, N, 0.746), insideNormal), 1.5);
    vec3 background = mix(vec3(0.97, 0.985, 1.0), vec3(0.018, 0.022, 0.035), uDark);
    // The page already supplies the clear background through canvas alpha.
    // Adding another white floor here washed out both refraction interfaces.
    vec3 transmission = mix(through, background, uDark * 0.28);
    float opticalDepth = 0.72 + 0.28 * sin(dot(vLocal, vec3(1.3, -1.7, 0.8)) + phase);
    transmission *= exp(-vec3(0.11, 0.06, 0.018) * opticalDepth);
    transmission = mix(transmission, compressNeutral(internalLight), 0.10 + 0.14 * pow(1.0 - facing, 2.0));
    float reflectance = clamp(0.18 + 0.75 * pow(fresnel, 0.4), 0.0, 0.96);
    vec3 color = mix(transmission, reflected, reflectance);
    // Refraction bands derive from the optical path and local surface angle.
    // Only these lobes carry the denser spectrum; clear windows retain their
    // transmission instead of receiving a global saturation/opacity boost.
    vec3 opticalNormal = turn * N;
    float cyanLobe = smoothstep(0.10, 0.72, dot(opticalNormal, vec3(0.45, 0.60, 0.40)));
    float pinkLobe = smoothstep(0.25, 0.80, dot(opticalNormal, vec3(-0.60, 0.10, 0.65)));
    vec3 spectralGlass = mix(vec3(0.008, 0.10, 0.94), vec3(0.025, 0.72, 0.98), cyanLobe);
    spectralGlass = mix(spectralGlass, vec3(0.92, 0.035, 0.62), pinkLobe);
    float pathBand = smoothstep(-0.30, 0.55, dot(opticalNormal, vec3(0.50, -0.40, 0.70)));
    float density = (0.18 + 0.40 * pathBand) * (1.0 - clearWindow * 0.8);
    // Wavelength-dependent absorption preserves the existing refraction
    // detail; mixing a flat palette over it produced concentric candy bands.
    color *= exp(-(vec3(1.0) - spectralGlass) * vec3(1.7, 0.8, 0.4) * density * 1.9);
    vec3 rimTint = mix(vec3(0.04, 0.45, 1.0), vec3(0.95, 0.12, 0.72), pinkLobe);
    // Keep the coloured Fresnel rim narrow; a broad additive rim exaggerates
    // every change of slope in the silhouette and masks the clear interface.
    color += rimTint * pow(1.0 - facing, 3.4) * 0.30;
    // Anisotropic studio softboxes bend with the true surface normals. Their
    // reflection rotates independently per instance and is not a painted ring.
    float key = softbox(reflection, normalize(vec3(-0.4, 0.6, 0.69)), normalize(vec3(0.83, 0.55, 0.0)), vec2(0.22, 0.48));
    float strip = softbox(reflection, normalize(vec3(0.65, -0.1, -0.75)), normalize(vec3(0.75, 0.0, 0.65)), vec2(0.085, 0.58));
    float gloss = max(key, strip * 0.85);
    color = mix(color, vec3(1.65), gloss * 0.84);
    color += vec3(highlight * 0.08);
    color = highlightShoulder(color);
    float opacity = clamp(0.50 + 0.21 * sqrt(fresnel) + 0.20 * chroma - 0.20 * clearWindow + highlight * 0.12, 0.24, 0.96);
    // Reflected softboxes stay crisp even where the underlying glass is clear.
    opacity = mix(opacity, 0.97, highlight * 0.90);
    opacity = mix(opacity, 0.98, gloss * 0.94);
    // Depth changes optical roughness above, not transmission brightness.
    // Multiplying alpha by 0.5 made the distant hero bubble almost black
    // when composited over the dark page, despite sharing this material.
    gl_FragColor = vec4(color, opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // Static, sub-LSB display-space dither breaks 8-bit gradient banding.
    // Apply once after sRGB conversion and before premultiplying canvas alpha.
    float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
    gl_FragColor.rgb = clamp(gl_FragColor.rgb + vec3(noise / 255.0), 0.0, 1.0);
    #include <premultiplied_alpha_fragment>
  }
`
export function createGlassMaterial(environment) {
  return new ShaderMaterial({
    name: 'Pearlescent thin-film liquid glass',
    uniforms: {
      uEnvironment: { value: environment }, uTime: { value: 0 }, uPhase: { value: 0 },
      uMotion: { value: 1 }, uHover: { value: 0 }, uDark: { value: 0 }, uDepth: { value: 0 },
      uOffsetScale: { value: 1 },
      uWave1: { value: new Vector4(1.6, 1.1, 0.7, 0) }, uWave2: { value: new Vector4(-1.3, 2.1, 1.6, 0) }, uWave3: { value: new Vector4(3.1, -1.7, 2.2, 0) },
      uWaveRates: { value: new Vector3(0.23, -0.168, 0.117) }, uDeformGain: { value: 1 },
      uSculptFrame: { value: new Matrix3() }, uSculptA: { value: new Vector4(0, 3, 0, 0) }, uSculptB: { value: new Vector4(0, 3, 0, 0) },
      uSculptCenter: { value: new Vector3() }, uSculptScale: { value: 1 }, uBreath: { value: new Vector3() },
      uEnvironmentRotation: { value: new Matrix3() }, uOptics: { value: new Vector3(0, 1, 0) },
    },
    // Canvas alpha supplies transparency over the page. Depth sorting avoids
    // repeated self-blending of the front interface on concave surfaces.
    vertexShader, fragmentShader, precision: 'highp', transparent: false, premultipliedAlpha: true, depthWrite: true,
  })
}
