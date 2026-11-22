import * as THREE from 'three';
import { GLSL_COMMON } from './glsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { band, disc, normalizeForMerge } from './geometry';
import { LAYOUT } from './layout';
import type { MaterialLibrary } from './materials';
import { PALETTE } from './palette';

/**
 * Deck material: tileable kit metal in world space + procedural panel seams and animated cyan inlays
 * (concentric rings and eight "data lanes" carrying pulses from the Command Center to the rim).
 */
function createDeckMaterial(lib: MaterialLibrary) {
  const orm = lib.tex('trim03_orm', false, '1k');
  const m = new THREE.MeshStandardMaterial({
    name: 'deck',
    map: lib.tex('trim03_base', true),
    normalMap: lib.tex('trim03_normal', false),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: orm,
    metalnessMap: orm,
    color: new THREE.Color('#3b4766'),
    roughness: 0.9,
    metalness: 0.5,
    envMapIntensity: 0.55,
  });
  const uniforms = { uTime: { value: 0 }, uInlay: { value: 1 } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCvWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_COMMON}
varying vec3 vCvWorld; uniform float uTime; uniform float uInlay;
`)
      .replace('#include <map_fragment>', `#include <map_fragment>
vec2 P = vCvWorld.xz;
float r = length(P);
float ang = atan(P.y, P.x + 1e-5);
float seam = 0.0; float glow = 0.0; float panel = 0.0;
if (r < ${LAYOUT.plinthRadius.toFixed(2)}) {
  // Plinth / Command Center hall: fine concentric panels.
  float ring = 1.6;
  float dR = abs(fract(r / ring + 0.5) - 0.5) * ring;
  float step15 = radians(15.0);
  float dA = abs(fract(ang / step15 + 0.5) - 0.5) * step15 * r;
  seam = max(cvLine(dR, 0.010), cvLine(dA, 0.010) * step(1.6, r));
  panel = cvHash12(vec2(floor(r / ring), floor(ang / step15)));
  glow += cvLine(r - 3.45, 0.03) * 1.2 + cvLine(r - 11.25, 0.035) * 0.9;
  glow += cvLine(r - 3.75, 0.012) * 0.6;
} else if (r < ${LAYOUT.chamferOuter.toFixed(2)}) {
  float step6 = radians(6.0);
  float dA = abs(fract(ang / step6 + 0.5) - 0.5) * step6 * r;
  seam = cvLine(dA, 0.012);
  panel = cvHash12(vec2(7.0, floor(ang / step6)));
} else {
  float ring = 2.4;
  float rr = r - ${LAYOUT.chamferOuter.toFixed(2)};
  float dR = abs(fract(rr / ring + 0.5) - 0.5) * ring;
  float step75 = radians(7.5);
  float dA = abs(fract(ang / step75 + 0.5) - 0.5) * step75 * r;
  seam = max(cvLine(dR, 0.013), cvLine(dA, 0.013));
  panel = cvHash12(vec2(floor(rr / ring), floor(ang / step75)));
  glow += cvLine(r - 13.35, 0.035) * 1.1;
  glow += cvLine(r - 22.15, 0.022) * 0.45;
  glow += cvLine(r - 30.55, 0.03) * 0.8;
  // Eight data lanes (every 45 degrees) with pulses travelling outward.
  float lane = radians(45.0);
  float dL = (fract(ang / lane + 0.5) - 0.5) * lane * r;
  float laneMask = cvLine(dL, 0.028) * smoothstep(13.4, 13.9, r) * (1.0 - smoothstep(30.0, 30.4, r));
  float laneId = floor(ang / lane + 0.5);
  float pulse = pow(fract((r - uTime * 2.6 - laneId * 1.7) / 8.5), 14.0);
  glow += laneMask * (0.18 + 1.9 * pulse);
  // Lane side rails: two faint parallel lines.
  glow += (cvLine(abs(dL) - 0.22, 0.008)) * smoothstep(13.4, 14.0, r) * (1.0 - smoothstep(29.8, 30.3, r)) * 0.35;
}
diffuseColor.rgb *= (0.86 + 0.22 * panel) * (1.0 - 0.6 * seam);
`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += CV_CYAN * glow * uInlay;
`);
  };
  m.customProgramCacheKey = () => 'cv-deck';
  return { material: m, uniforms };
}

/** Trim-sheet hull material (big dark panel region of T_Trim_01 mapped around each tier). */
function createHullMaterial(lib: MaterialLibrary) {
  const orm = lib.tex('trim01_orm', false, '1k');
  return new THREE.MeshStandardMaterial({
    name: 'hull',
    map: lib.tex('trim01_base', true),
    normalMap: lib.tex('trim01_normal', false),
    roughnessMap: orm,
    metalnessMap: orm,
    aoMap: orm,
    color: new THREE.Color('#6c7aa0'),
    roughness: 1,
    metalness: 1,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide,
  });
}

export function createIsland(lib: MaterialLibrary) {
  const group = new THREE.Group();
  group.name = 'island';
  const colliders = new THREE.Group();
  colliders.name = 'island-colliders';
  const { material: deckMat, uniforms: deckUniforms } = createDeckMaterial(lib);
  const hullMat = createHullMaterial(lib);
  const metal = lib.get('MI_Trim_01');
  const glow = new THREE.MeshStandardMaterial({ name: 'rim-glow', color: '#000000', emissive: PALETTE.cyan, emissiveIntensity: 2.2 });
  const glowSoft = new THREE.MeshStandardMaterial({ name: 'rim-glow-soft', color: '#000000', emissive: PALETTE.eblue, emissiveIntensity: 1.4 });

  // Geometry is collected per material and merged at the end (one draw call per material).
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (g: THREE.BufferGeometry, m: THREE.Material, opts: { collide?: boolean } = {}) => {
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m)!.push(g);
    if (opts.collide) colliders.add(new THREE.Mesh(g));
  };

  const { plinthRadius: P, plinthTop: PT, chamferOuter: C, plazaRadius: R, curbTop, islandRadius: RO } = LAYOUT;

  // ---- Deck (walkable)
  add(disc(P, PT, { tile: 3 }), deckMat, { collide: true });
  add(band(P, PT, C, 0, { worldUV: true, tile: 3 }), deckMat, { collide: true });
  add(band(C, 0, R, 0, { worldUV: true, tile: 3, segments: 160 }), deckMat, { collide: true });
  // Plinth outer lip (thin vertical face under the chamfer start, catches light).
  add(band(P - 0.02, PT, P - 0.02, PT - 0.06, {}), metal);

  // ---- Curb, rail and glass balustrade
  add(band(R, 0, R, curbTop, { flip: true, tile: 2, segments: 160 }), metal, { collide: true });
  add(band(R, curbTop, RO, curbTop, { tile: 2, segments: 160 }), metal, { collide: true });
  add(band(RO, curbTop, RO, -0.45, { tile: 2, segments: 160 }), metal);
  add(band(R - 0.01, curbTop - 0.05, R - 0.01, curbTop - 0.02, { flip: true, segments: 160 }), glow); // inner curb light line
  add(band(RO + 0.01, -0.25, RO + 0.01, -0.2, { segments: 160 }), glowSoft); // outer edge line

  const glass = new THREE.MeshPhysicalMaterial({
    name: 'balustrade-glass', color: '#5fb6ff', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.16,
    depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4,
  });
  const rail = LAYOUT.railRadius;
  const glassMesh = new THREE.Mesh(band(rail, curbTop + 0.05, rail, curbTop + 1.12, { segments: 160 }), glass);
  glassMesh.renderOrder = 2;
  group.add(glassMesh);
  // Top rail (metal tube) + slim cyan light under it.
  add(new THREE.TorusGeometry(rail, 0.045, 8, 220).rotateX(Math.PI / 2).translate(0, curbTop + 1.16, 0), metal);
  add(new THREE.TorusGeometry(rail - 0.02, 0.012, 6, 220).rotateX(Math.PI / 2).translate(0, curbTop + 1.1, 0), glow);
  // Posts (instanced).
  const postGeo = new THREE.BoxGeometry(0.08, 1.12, 0.14);
  postGeo.translate(0, curbTop + 0.6, 0);
  const posts = new THREE.InstancedMesh(postGeo, metal, 72);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    m4.compose(new THREE.Vector3(Math.cos(a) * rail, 0, Math.sin(a) * rail), q, s);
    posts.setMatrixAt(i, m4);
  }
  posts.castShadow = false;
  posts.receiveShadow = true;
  group.add(posts);
  // Invisible rim wall keeps the player on the island.
  const wall = new THREE.CylinderGeometry(R - 0.05, R - 0.05, 4, 96, 1, true);
  wall.translate(0, 1.5, 0);
  colliders.add(new THREE.Mesh(wall));

  // ---- Hull (underside): stepped tiers mapped on the trim sheet's large dark panel.
  const tiers: [number, number, number, number][] = [
    [RO, -0.45, RO - 0.9, -1.35],
    [RO - 0.9, -1.35, 27.2, -1.95],
    [27.2, -1.95, 26.4, -4.4],
    [26.4, -4.4, 20.8, -5.1],
    [20.8, -5.1, 19.9, -8.3],
    [19.9, -8.3, 13.6, -9.4],
    [13.6, -9.4, 12.6, -13.2],
    [12.6, -13.2, 6.8, -15.8],
    [6.8, -15.8, 3.2, -21.0],
    [3.2, -21.0, 1.2, -23.4],
  ];
  tiers.forEach(([r0, y0, r1, y1], i) => {
    const steep = Math.abs(y1 - y0) > Math.abs(r1 - r0);
    const g = band(r0, y0, r1, y1, { segments: 144, tile: steep ? 6 : 8, vRange: steep ? [0.515, 0.915] : [0.36, 0.47], flip: true });
    add(g, hullMat);
    if (steep && i < 8) {
      // Seam light at the bottom edge of each vertical tier.
      add(band(r1 + 0.03, y1 + 0.18, r1 + 0.03, y1 + 0.26, { segments: 144 }), i % 4 === 2 ? glowSoft : glow);
    }
  });
  // Gravity core under the tip.
  const coreMat = new THREE.MeshStandardMaterial({ name: 'gravity-core', color: '#000000', emissive: PALETTE.cyan, emissiveIntensity: 4 });
  for (const [m, geos] of buckets) {
    const merged = mergeGeometries(geos.map((g) => normalizeForMerge(g)), false)!;
    const mesh = new THREE.Mesh(merged, m);
    mesh.receiveShadow = m !== hullMat;
    mesh.name = `island:${m.name}`;
    group.add(mesh);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 16), coreMat);
  core.position.y = -23.6;
  group.add(core);
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.08, 8, 64).rotateX(Math.PI / 2), coreMat);
  coreRing.position.y = -22.2;
  group.add(coreRing);

  return {
    group,
    colliders,
    deckUniforms,
    update(t: number) {
      deckUniforms.uTime.value = t;
      coreRing.rotation.y = t * 0.4;
      coreRing.position.y = -22.2 + Math.sin(t * 0.8) * 0.25;
      coreMat.emissiveIntensity = 3.6 + Math.sin(t * 2.0) * 0.6;
    },
  };
}
