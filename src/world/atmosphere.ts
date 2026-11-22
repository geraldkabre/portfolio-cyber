import * as THREE from 'three';
import { GLSL_COMMON } from './glsl';

/** Shared atmosphere parameters: the sky horizon, the fog and the cloud sea fade to the same colour. */
export const ATMOSPHERE = {
  horizon: new THREE.Color().setRGB(0.011, 0.018, 0.052, THREE.LinearSRGBColorSpace),
  fogDensity: 0.0026,
  // Moon: north-west, 28 degrees above the horizon (north = -Z, east = +X).
  moonDir: new THREE.Vector3(-0.676, 0.469, -0.568).normalize(),
};

/** Renders a full-screen fragment shader once into a texture (procedural assets baked at load time). */
export function bakeTexture(renderer: THREE.WebGLRenderer, width: number, height: number, fragmentShader: string, opts: {
  srgb?: boolean; wrap?: THREE.Wrapping; uniforms?: Record<string, THREE.IUniform>; mipmaps?: boolean;
} = {}) {
  const mips = opts.mipmaps ?? true;
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.UnsignedByteType,
    colorSpace: opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    depthBuffer: false,
    generateMipmaps: mips,
    minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: opts.wrap ?? THREE.ClampToEdgeWrapping,
    wrapT: opts.wrap ?? THREE.ClampToEdgeWrapping,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: opts.uniforms ?? {},
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  }));
  scene.add(quad);
  const prev = renderer.getRenderTarget();
  const prevTone = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(prev);
  renderer.toneMapping = prevTone;
  quad.geometry.dispose();
  (quad.material as THREE.Material).dispose();
  return target;
}

/** Sky colour function (gradient, horizon glow, nebula band) evaluated for a direction. Baked to an equirect map. */
const SKY_BASE = /* glsl */ `
  ${GLSL_COMMON}
  uniform vec3 uHorizon;
  varying vec2 vUv;
  void main() {
    float lon = (vUv.x - 0.5) * 6.2831853;
    float lat = (vUv.y - 0.5) * 3.1415926;
    vec3 d = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
    float h = d.y;
    vec3 zenith = vec3(0.0012, 0.0021, 0.0068);
    vec3 mid = vec3(0.0034, 0.0062, 0.0200);
    vec3 col = mix(uHorizon, mid, smoothstep(0.0, 0.22, h));
    col = mix(col, zenith, smoothstep(0.22, 0.85, h));
    float az = atan(d.z, d.x + 1e-5);
    col += CV_VIOLET * 0.018 * exp(-abs(h - 0.02) * 16.0) * (0.55 + 0.45 * sin(az * 2.0 + 0.7));
    col += CV_CYAN * 0.006 * exp(-abs(h) * 28.0);
    vec3 bandN = normalize(vec3(0.35, 0.62, -0.70));
    float band = exp(-pow(dot(d, bandN), 2.0) * 9.0);
    float neb = cvFbm3(d * 3.2);
    float neb2 = cvFbm3(d * 7.0 + 4.0);
    vec3 nebCol = mix(CV_VIOLET, CV_EBLUE, smoothstep(0.35, 0.75, neb2));
    col += nebCol * smoothstep(0.42, 0.9, neb) * band * 0.045 * smoothstep(-0.02, 0.25, h);
    col = mix(col, uHorizon, smoothstep(0.0, -0.06, h));
    // Star density mask (alpha): fewer stars inside the bright nebula and near the horizon.
    float starMask = smoothstep(0.02, 0.2, h) * (1.0 - band * smoothstep(0.5, 0.8, neb) * 0.5);
    gl_FragColor = vec4(col, starMask);
  }`;

export function createSky(renderer: THREE.WebGLRenderer) {
  const base = bakeTexture(renderer, 2048, 1024, SKY_BASE, { srgb: true, mipmaps: false, uniforms: { uHorizon: { value: ATMOSPHERE.horizon.clone() } } });
  const uniforms = {
    uTime: { value: 0 },
    uMoonDir: { value: ATMOSPHERE.moonDir.clone() },
    uBase: { value: base.texture },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w; // always at the far plane
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uTime; uniform vec3 uMoonDir; uniform sampler2D uBase;
      varying vec3 vDir;
      float starLayer(vec3 d, float scale, float threshold, float seed) {
        vec3 p = d * scale;
        vec3 cell = floor(p);
        vec3 c = cell + 0.5 + (cvHash33(cell + seed) - 0.5) * 0.7;
        float dist = length(p - c);
        float px = length(fwidth(p)) * 0.9;
        float h = cvHash13(cell + seed * 1.7);
        float mag = pow(max(h - threshold, 0.0) / (1.0 - threshold), 2.0);
        float tw = 0.75 + 0.25 * sin(uTime * (1.5 + 3.0 * h) + h * 40.0);
        return step(threshold, h) * (0.25 + 1.6 * mag) * tw * (1.0 - smoothstep(0.0, px * 1.4, dist));
      }
      void main() {
        vec3 d = normalize(vDir);
        vec2 uv = vec2(atan(d.z, d.x + 1e-6) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415926 + 0.5);
        vec4 base = textureLod(uBase, uv, 0.0); // LOD 0: no mip seam at the equirect wrap
        vec3 col = base.rgb;
        if (base.a > 0.001) col += (starLayer(d, 110.0, 0.955, 3.1) + starLayer(d, 260.0, 0.975, 9.7) * 0.6) * base.a * vec3(0.55, 0.68, 1.0) * 0.55;
        float md = dot(d, uMoonDir);
        float disk = smoothstep(0.99955, 0.99968, md);
        col += disk * vec3(0.78, 0.86, 1.0) * 2.4 * (0.85 + 0.15 * cvNoise(d.xz * 900.0));
        col += vec3(0.20, 0.30, 0.62) * pow(max(md, 0.0), 900.0) * 0.5;
        col += vec3(0.05, 0.08, 0.20) * pow(max(md, 0.0), 24.0) * 0.20;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), material);
  mesh.name = 'sky';
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  mesh.userData.noCollide = true;
  return {
    mesh,
    update(t: number, camera: THREE.Camera) {
      uniforms.uTime.value = t;
      mesh.position.copy(camera.position);
    },
  };
}

/** Tileable two-channel fbm noise (periodic value noise), baked once for the cloud sea. */
const CLOUD_NOISE = /* glsl */ `
  varying vec2 vUv;
  float h(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float pnoise(vec2 p, float period) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = h(mod(i, period)), b = h(mod(i + vec2(1, 0), period)), c = h(mod(i + vec2(0, 1), period)), d = h(mod(i + vec2(1, 1), period));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float pfbm(vec2 uv, float period, float seed) {
    float s = 0.0, a = 0.5;
    for (int o = 0; o < 6; o++) { s += a * pnoise(uv * period + seed, period); period *= 2.0; a *= 0.5; }
    return s;
  }
  void main() { gl_FragColor = vec4(pfbm(vUv, 6.0, 0.0), pfbm(vUv, 10.0, 17.0), pfbm(vUv, 4.0, 41.0), 1.0); }`;

/** Animated sea of clouds far below the island, faintly lit by the hidden city. */
export function createCloudSea(renderer: THREE.WebGLRenderer) {
  const noise = bakeTexture(renderer, 512, 512, CLOUD_NOISE, { wrap: THREE.RepeatWrapping });
  const uniforms = {
    uTime: { value: 0 },
    uHorizon: { value: ATMOSPHERE.horizon.clone() },
    uMoonDir: { value: ATMOSPHERE.moonDir.clone() },
    uNoise: { value: noise.texture },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: true,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uTime; uniform vec3 uHorizon; uniform vec3 uMoonDir; uniform sampler2D uNoise;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz * 0.0011;
        float t = uTime * 0.0022;
        float n = texture2D(uNoise, p + vec2(t, t * 0.4)).r;
        float n2 = texture2D(uNoise, p * 2.7 - vec2(t * 1.6, -t)).g;
        float dens = smoothstep(0.35, 0.85, n * 0.7 + n2 * 0.45);
        vec3 col = mix(vec3(0.0045, 0.0075, 0.022), vec3(0.018, 0.028, 0.068), dens);
        col += vec3(0.020, 0.030, 0.070) * pow(dens, 3.0) * max(uMoonDir.y, 0.0);
        float city = smoothstep(0.55, 0.9, texture2D(uNoise, vWorld.xz * 0.00035 + 0.37).b);
        col += mix(CV_EBLUE, CV_VIOLET, n2) * city * (1.0 - dens) * 0.020;
        float dist = length(vWorld.xz - cameraPosition.xz);
        col = mix(col, uHorizon, clamp(1.0 - exp(-dist * 0.0019), 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1).rotateX(-Math.PI / 2), material);
  mesh.position.y = -70;
  mesh.name = 'cloud-sea';
  mesh.renderOrder = -9;
  mesh.userData.noCollide = true;
  return {
    mesh,
    update(t: number) {
      uniforms.uTime.value = t;
    },
  };
}
