import * as THREE from 'three';
import { GLSL_COMMON } from './glsl';

/** One shared time uniform for every procedural effect (updated once per frame by the world). */
export const FX_TIME = { value: 0 };

const additive = (uniforms: Record<string, THREE.IUniform>, vertexShader: string, fragmentShader: string, extra: Partial<THREE.ShaderMaterialParameters> = {}) =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: FX_TIME, ...uniforms },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    ...extra,
  });

const VS_BASIC = /* glsl */ `
  varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewDir; varying vec3 vWorld; varying vec3 vTint;
  void main() {
    vUv = uv;
    #ifdef USE_COLOR
    vTint = color.rgb;
    #else
    vTint = vec3(1.0);
    #endif
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mv = viewMatrix * w;
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

/** Hologram surface: fresnel rim, horizontal scanlines, subtle flicker. */
export function holoMaterial(color: THREE.ColorRepresentation, intensity = 1.6, opts: { scan?: number; base?: number } = {}) {
  return additive(
    { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uScan: { value: opts.scan ?? 18 }, uBase: { value: opts.base ?? 0.18 } },
    VS_BASIC,
    /* glsl */ `
      ${GLSL_COMMON}
      uniform float uTime; uniform vec3 uColor; uniform float uIntensity; uniform float uScan; uniform float uBase;
      varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewDir; varying vec3 vWorld;
      void main() {
        float nl = length(vNormalV);
        // Line geometries have no normals: use a constant rim instead of normalize(0) (NaN).
        float fres = nl > 0.01 ? pow(max(0.0, 1.0 - abs(dot(vNormalV / nl, normalize(vViewDir)))), 2.2) : 0.6;
        float scan = 0.65 + 0.35 * sin(vWorld.y * uScan * 6.2831 - uTime * 3.0);
        float flick = 0.92 + 0.08 * sin(uTime * 37.0) * sin(uTime * 13.0);
        float a = (uBase + fres) * scan * flick;
        gl_FragColor = vec4(uColor * a * uIntensity, 1.0);
      }`,
  );
}

/** Thin dashed ring (RingGeometry) with segments travelling around it. */
export function ringMaterial(color: THREE.ColorRepresentation, intensity = 2.2, dashes = 48, speed = 0.15) {
  return additive(
    { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uDashes: { value: dashes }, uSpeed: { value: speed } },
    VS_BASIC,
    /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uIntensity; uniform float uDashes; uniform float uSpeed;
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vec2 c = vUv - 0.5;
        float ang = atan(c.y, c.x) / 6.2831853 + 0.5;
        float dash = smoothstep(0.42, 0.5, abs(fract(ang * uDashes - uTime * uSpeed * uDashes) - 0.5)) ;
        float seg = step(0.5, fract(ang * 3.0 + uTime * uSpeed * 0.5)) * 0.35 + 0.65;
        float edge = 1.0; // ring width handled by geometry
        float a = (0.35 + 0.65 * (1.0 - dash)) * seg * edge;
        gl_FragColor = vec4(uColor * a * uIntensity, 1.0);
      }`,
  );
}

/** Vertical light beam (open cylinder), fading upward and at the silhouette. */
export function beamMaterial(color: THREE.ColorRepresentation, intensity = 1.2, vertexColors = false) {
  return additive(
    { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
    VS_BASIC,
    /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uIntensity;
      varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewDir; varying vec3 vTint;
      void main() {
        float nlen = length(vNormalV);
        float facing = nlen > 0.01 ? clamp(abs(dot(vNormalV / nlen, normalize(vViewDir))), 0.0, 1.0) : 1.0;
        float core = pow(facing, 2.5);
        float fade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6) * smoothstep(0.0, 0.02, vUv.y);
        float pulse = 0.85 + 0.15 * sin(vUv.y * 60.0 - uTime * 4.0);
        fade = max(fade, 0.0);
        gl_FragColor = vec4(uColor * vTint * core * fade * pulse * uIntensity, 1.0);
      }`,
    { vertexColors },
  );
}

/** Energy core column: bright flowing stripes moving upward. */
export function energyMaterial(color: THREE.ColorRepresentation, intensity = 2.6) {
  return additive(
    { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
    VS_BASIC,
    /* glsl */ `
      ${GLSL_COMMON}
      uniform float uTime; uniform vec3 uColor; uniform float uIntensity;
      varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewDir; varying vec3 vWorld;
      void main() {
        float nlen = length(vNormalV);
        float facing = nlen > 0.01 ? clamp(abs(dot(vNormalV / nlen, normalize(vViewDir))), 0.0, 1.0) : 1.0;
        float flow = cvNoise(vec2(vUv.x * 12.0, vWorld.y * 0.9 - uTime * 2.2));
        float stripes = smoothstep(0.55, 0.95, flow);
        float bands = pow(fract(vWorld.y * 0.35 - uTime * 0.9), 10.0);
        float a = 0.28 + 0.9 * stripes + 1.6 * bands;
        a *= 0.4 + 0.6 * pow(facing, 0.6);
        gl_FragColor = vec4(uColor * a * uIntensity, 1.0);
      }`,
  );
}

/** Portal surface: swirling cyan/violet energy inside a rectangle (PlaneGeometry, uv 0..1). */
export function portalMaterial() {
  const uniforms = { uActive: { value: 1 }, uSurge: { value: 0 }, uNear: { value: 0 } };
  const material = additive(
    uniforms,
    /* glsl */ `
      varying vec2 vUv; varying float vCamDist;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vCamDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    /* glsl */ `
      ${GLSL_COMMON}
      uniform float uTime; uniform float uActive; uniform float uSurge; uniform float uNear;
      varying vec2 vUv; varying float vCamDist;
      void main() {
        // Dim when seen from behind or from very close (third-person camera passing through).
        float view = (gl_FrontFacing ? 1.0 : 0.25) * smoothstep(0.4, 2.5, vCamDist);
        vec2 p = (vUv - 0.5) * vec2(1.0, 1.7);
        float r = length(p);
        float a = atan(p.y, p.x + 1e-5);
        float swirl = cvFbm(vec2(a * 1.6 + r * 5.0 - uTime * 1.3, r * 4.0 - uTime * 0.7));
        float swirl2 = cvFbm(vec2(a * 2.4 - r * 3.0 + uTime * 0.9, r * 7.0 + uTime * 0.4) + 5.0);
        vec3 col = mix(CV_VIOLET, CV_CYAN, smoothstep(0.3, 0.8, swirl));
        col = mix(col, CV_ICE, smoothstep(0.72, 0.95, swirl2) * 0.6);
        float rect = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x) * smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
        float edge = 1.0 - rect;
        float rings = 0.5 + 0.5 * sin(r * 26.0 - uTime * 5.0);
        float body = (0.35 + 0.65 * swirl) * (0.75 + 0.25 * rings) * rect;
        // uNear: the operator walks up to the portal -> the surface brightens and its rim lights up.
        float intensity = (body * (1.5 + uNear * 0.8) + uSurge * 2.5 * rect + edge * uNear * 0.9) * uActive * view;
        gl_FragColor = vec4(col * intensity, 1.0);
      }`,
  );
  return { material, uniforms };
}

/** Flowing data stream along a TubeGeometry (uv.x = along the curve). */
export function streamMaterial(color: THREE.ColorRepresentation, intensity = 1.4, speed = 0.12, vertexColors = false) {
  return additive(
    { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uSpeed: { value: speed } },
    VS_BASIC,
    /* glsl */ `
      ${GLSL_COMMON}
      uniform float uTime; uniform vec3 uColor; uniform float uIntensity; uniform float uSpeed;
      varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewDir; varying vec3 vTint;
      void main() {
        float nlen = length(vNormalV);
        float facing = nlen > 0.01 ? clamp(abs(dot(vNormalV / nlen, normalize(vViewDir))), 0.0, 1.0) : 1.0;
        float s = vUv.x;
        float packets = pow(fract(s * 14.0 - uTime * uSpeed * 14.0), 18.0);
        float dashes = step(0.45, fract(s * 160.0 - uTime * uSpeed * 60.0));
        float ends = smoothstep(0.0, 0.03, s) * smoothstep(1.0, 0.94, s);
        float a = (0.18 + 0.12 * dashes + 2.2 * packets) * pow(facing, 1.5) * ends;
        gl_FragColor = vec4(uColor * vTint * a * uIntensity, 1.0);
      }`,
    { vertexColors },
  );
}

/** Floating particles (Points) drifting around a volume, soft round sprites, twinkling. */
export function particleMaterial(size = 0.12, pixelRatio = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: FX_TIME, uSize: { value: size }, uPixelRatio: { value: pixelRatio } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSize; uniform float uPixelRatio;
      attribute vec4 aSeed; // x,y,z phase, w = colour mix
      varying float vAlpha; varying float vMix;
      void main() {
        vec3 p = position;
        float t = uTime * (0.15 + aSeed.x * 0.2);
        p.x += sin(t + aSeed.y * 6.28) * 0.8;
        p.z += cos(t * 0.8 + aSeed.z * 6.28) * 0.8;
        p.y += mod(uTime * (0.05 + aSeed.y * 0.12) + aSeed.z * 30.0, 30.0) - 4.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.5 + 0.5 * sin(uTime * (1.0 + aSeed.x * 3.0) + aSeed.w * 30.0);
        vAlpha = tw * smoothstep(-4.0, -1.0, p.y) * (1.0 - smoothstep(18.0, 26.0, p.y));
        vMix = aSeed.w;
        gl_PointSize = uSize * uPixelRatio * (300.0 / max(1.0, -mv.z));
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      varying float vAlpha; varying float vMix;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(CV_CYAN, CV_VIOLET, step(0.82, vMix));
        gl_FragColor = vec4(col * a * vAlpha * 0.9, 1.0);
      }`,
  });
}

/**
 * Waits (briefly) for the display typeface used by the holographic texts — the same Geist as Recruiter Mode — so
 * the canvas textures are drawn with it and not with a fallback. Never blocks the load for long.
 */
export async function displayFontsReady(timeout = 2500) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const load = Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 48px "Geist Variable"`).catch(() => [])));
  await Promise.race([load, new Promise((r) => setTimeout(r, timeout))]);
}

/** Canvas-based text texture for holographic signs and panels. */
export function textTexture(lines: { text: string; size: number; color?: string; weight?: number; spacing?: number; font?: string }[], opts: {
  width?: number; height?: number; align?: CanvasTextAlign; padding?: number; background?: string;
} = {}) {
  const w = opts.width ?? 1024, h = opts.height ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (opts.background) { ctx.fillStyle = opts.background; ctx.fillRect(0, 0, w, h); }
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  const total = lines.reduce((s, l) => s + l.size * 1.35, 0);
  let y = (h - total) / 2;
  const x = opts.align === 'left' ? (opts.padding ?? 40) : w / 2;
  for (const l of lines) {
    y += l.size * 0.675;
    ctx.font = `${l.weight ?? 600} ${l.size}px ${l.font ?? '"Geist Variable", "Geist", "Segoe UI", "Inter", system-ui, sans-serif'}`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${l.spacing ?? 0}px`;
    ctx.fillStyle = l.color ?? '#ffffff';
    ctx.shadowColor = l.color ?? '#ffffff';
    ctx.shadowBlur = l.size * 0.25;
    ctx.fillText(l.text, x, y);
    y += l.size * 0.675;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Additive textured plane for holographic text (uses textTexture). */
export function holoTextMaterial(tex: THREE.Texture, color: THREE.ColorRepresentation = '#ffffff', intensity = 1.6) {
  return additive(
    { uMap: { value: tex }, uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
    /* glsl */ `
      varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    /* glsl */ `
      uniform float uTime; uniform sampler2D uMap; uniform vec3 uColor; uniform float uIntensity;
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        float scan = 0.82 + 0.18 * sin(vWorld.y * 90.0 - uTime * 4.0);
        float flick = 0.94 + 0.06 * sin(uTime * 23.0 + vWorld.x);
        vec3 c = t.rgb * uColor * t.a * scan * flick * uIntensity;
        gl_FragColor = vec4(c, 1.0);
      }`,
    { side: THREE.FrontSide },
  );
}
