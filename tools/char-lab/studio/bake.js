// UV-space texture baking for VRM clothing redesign (browser ES module, three.js r169).
// The garment mesh is rasterised in UV space; every texel therefore knows its bind-pose 3D position
// and normal. A recipe GLSL function `design()` decides colour and emission per texel from that
// position/normal plus the original texture (sharp and blurred). Results are dilated past the UV
// island borders (no seams in mipmaps) and composited over the original image (its alpha is kept).
import * as THREE from 'three';
import { readAccessor } from './glb.js';

export async function decodeImage(bytes, mime) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bitmap, 0, 0);
  return { bitmap, width: bitmap.width, height: bitmap.height, data: g.getImageData(0, 0, bitmap.width, bitmap.height).data };
}

export function textureFrom(bitmap) {
  const t = new THREE.Texture(bitmap);
  t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  return t;
}

/** BufferGeometry (bind pose) for one primitive of a glTF mesh. */
export function primitiveGeometry(doc, meshIndex, primIndex) {
  const p = doc.json.meshes[meshIndex].primitives[primIndex];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(readAccessor(doc, p.attributes.POSITION), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(readAccessor(doc, p.attributes.NORMAL), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(readAccessor(doc, p.attributes.TEXCOORD_0), 2));
  g.setIndex(new THREE.BufferAttribute(readAccessor(doc, p.indices), 1));
  return g;
}

const VERT = /* glsl */`
varying vec3 vP; varying vec3 vN; varying vec2 vUv;
void main() {
  // VRM 0.x raw space faces -Z: rotate 180 deg around Y so that the character faces +Z, left hand at +X
  vP = vec3(-position.x, position.y, -position.z);
  vN = vec3(-normal.x, normal.y, -normal.z);
  vUv = uv;
  gl_Position = vec4(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0);
}`;

export const GLSL_LIB = /* glsl */`
#define NAVY_950 vec3(0.027, 0.043, 0.094)
#define NAVY_900 vec3(0.043, 0.075, 0.150)
#define NAVY_800 vec3(0.071, 0.114, 0.220)
#define SLATE    vec3(0.118, 0.165, 0.282)
#define CYAN     vec3(0.000, 0.898, 1.000)
#define EBLUE    vec3(0.184, 0.482, 1.000)
#define VIOLET   vec3(0.545, 0.361, 1.000)
#define ICE      vec3(0.866, 0.965, 1.000)
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
// anti-aliased band of half-width w around d = 0 (d in any unit; AA from screen-space derivative = texel size)
float band(float d, float w) { float aa = max(fwidth(d), 1e-5); return 1.0 - smoothstep(w - aa, w + aa, abs(d)); }
float step2(float d) { float aa = max(fwidth(d), 1e-5); return smoothstep(-aa, aa, d); }   // AA step at d = 0
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// hexagon SDF (flat-top), r = circumradius
float sdHex(vec2 p, float r) { const vec3 k = vec3(-0.866025404, 0.5, 0.577350269); p = abs(p); p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy; p -= vec2(clamp(p.x, -k.z * r, k.z * r), r); return length(p) * sign(p.y); }
vec3 rgb2hsv(vec3 c) { vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// hex grid: distance to nearest hexagon cell border (cells of size s)
float hexGrid(vec2 p, float s) {
  vec2 r = vec2(1.0, 1.7320508); vec2 h = r * 0.5;
  vec2 a = mod(p / s, r) - h; vec2 b = mod(p / s - h, r) - h;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  return (0.5 - max(abs(g.x) * 0.5 + abs(g.y) * 0.8660254, abs(g.x))) * s;
}
`;

const FRAG = (design) => /* glsl */`
uniform sampler2D baseMap; uniform float blurLod; uniform int bakePass; uniform vec2 texSize;
varying vec3 vP; varying vec3 vN; varying vec2 vUv;
${GLSL_LIB}
${design}
void main() {
  vec3 N = normalize(vN);
  vec4 base = texture2D(baseMap, vUv);
  vec4 soft = textureLod(baseMap, vUv, blurLod);
  vec3 col = base.rgb; vec3 emi = vec3(0.0);
  design(vP, N, vUv, base, soft, col, emi);
  gl_FragColor = vec4(bakePass == 0 ? clamp(col, 0.0, 1.0) : clamp(emi, 0.0, 1.0), 1.0);
}`;

/**
 * Bake one texture.  opts: { geometries, width, height, baseBitmap, design (GLSL), uniforms, blurLod }
 * returns { color, emission, covered } as top-down Uint8Arrays (RGBA, RGBA, 1 byte).
 */
export function bakeUV(renderer, opts) {
  const { width: W, height: H } = opts;
  const baseTex = textureFrom(opts.baseBitmap);
  const uniforms = { baseMap: { value: baseTex }, blurLod: { value: opts.blurLod ?? 4 }, bakePass: { value: 0 }, texSize: { value: new THREE.Vector2(W, H) }, ...(opts.uniforms || {}) };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG(opts.design), uniforms, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  for (const g of opts.geometries) { const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m); }
  const cam = new THREE.Camera();
  const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
  const read = (pass) => {
    uniforms.bakePass.value = pass;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
    const buf = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    const out = new Uint8Array(W * H * 4);   // flip to top-down rows
    for (let y = 0; y < H; y++) out.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    return out;
  };
  const color = read(0), emission = read(1);
  renderer.setRenderTarget(null);
  const covered = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) covered[i] = color[i * 4 + 3] > 0 ? 1 : 0;
  rt.dispose(); mat.dispose(); baseTex.dispose();
  return { color, emission, covered, width: W, height: H };
}

/** Grow baked texels into the empty neighbourhood (avoids dark seams in mipmaps / bilinear filtering). */
export function dilate(res, iterations = 8) {
  const { width: W, height: H } = res; let cov = res.covered;
  const bufs = [res.color, res.emission];
  const [C, E] = bufs; const nb = [0, 0, 0, 0];
  for (let it = 0; it < iterations; it++) {
    const next = cov.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (cov[i]) continue;
      let n = 0;
      if (x + 1 < W && cov[i + 1]) nb[n++] = i + 1;
      if (x > 0 && cov[i - 1]) nb[n++] = i - 1;
      if (y + 1 < H && cov[i + W]) nb[n++] = i + W;
      if (y > 0 && cov[i - W]) nb[n++] = i - W;
      if (!n) continue;
      let r = 0, g = 0, b = 0, er = 0, eg = 0, eb = 0;
      for (let k = 0; k < n; k++) { const j = nb[k] * 4; r += C[j]; g += C[j + 1]; b += C[j + 2]; er += E[j]; eg += E[j + 1]; eb += E[j + 2]; }
      const o = i * 4; C[o] = r / n; C[o + 1] = g / n; C[o + 2] = b / n; E[o] = er / n; E[o + 1] = eg / n; E[o + 2] = eb / n;
      next[i] = 1;
    }
    cov = next;
  }
  res.dilated = cov; return res;
}

/** Final RGBA: baked colour where covered (after dilation), original elsewhere; alpha always from the original (resampled if sizes differ). */
export function composite(res, orig, alphaFn = null) {
  const { width: W, height: H } = res;
  const o = resample(orig, W, H);
  const rgba = new Uint8ClampedArray(W * H * 4), emis = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const c = res.dilated ? res.dilated[i] : res.covered[i];
    for (let k = 0; k < 3; k++) { rgba[i * 4 + k] = c ? res.color[i * 4 + k] : o[i * 4 + k]; emis[i * 4 + k] = c ? res.emission[i * 4 + k] : 0; }
    rgba[i * 4 + 3] = alphaFn ? alphaFn(o[i * 4 + 3]) : o[i * 4 + 3]; emis[i * 4 + 3] = 255;
  }
  return { rgba, emis };
}

export function resample(img, W, H) {
  if (img.width === W && img.height === H) return img.data;
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high'; g.drawImage(img.bitmap, 0, 0, W, H);
  return g.getImageData(0, 0, W, H).data;
}

/** Box-filtered downscale of an RGBA buffer (high-quality canvas resampling). */
export function downscale(rgba, W, H, w, h) {
  const src = new OffscreenCanvas(W, H); src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), W, H), 0, 0);
  const dst = new OffscreenCanvas(w, h); const g = dst.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

export async function encode(rgba, W, H, mime = 'image/webp', quality = 0.9) {
  const c = new OffscreenCanvas(W, H); c.getContext('2d').putImageData(new ImageData(rgba, W, H), 0, 0);
  const blob = await c.convertToBlob({ type: mime, quality });
  if (blob.type !== mime) throw new Error(`encoder returned ${blob.type} instead of ${mime}`);
  return new Uint8Array(await blob.arrayBuffer());
}

/** Re-encode an existing image (optionally downscaled). */
export async function reencode(img, W, H, mime, quality) {
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(img.bitmap, 0, 0, W, H);
  const blob = await c.convertToBlob({ type: mime, quality });
  if (blob.type !== mime) throw new Error(`encoder returned ${blob.type} instead of ${mime}`);
  return new Uint8Array(await blob.arrayBuffer());
}

export function hasAlpha(img) { for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 255) return true; return false; }

/** Small preview of a top-down RGBA buffer as data URL. */
export function previewURL(rgba, W, H, max = 1024) {
  const c = document.createElement('canvas'); const s = Math.min(1, max / Math.max(W, H));
  const t = new OffscreenCanvas(W, H); t.getContext('2d').putImageData(new ImageData(rgba, W, H), 0, 0);
  c.width = Math.round(W * s); c.height = Math.round(H * s);
  const g = c.getContext('2d'); g.fillStyle = '#ff00ff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(t, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
