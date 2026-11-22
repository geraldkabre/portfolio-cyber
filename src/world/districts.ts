import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLSL_COMMON } from './glsl';
import { beamMaterial, streamMaterial, textTexture } from './fx';
import { PALETTE } from './palette';
import { DISTRICTS } from '../content/profile';

const DEG = Math.PI / 180;

/** Distant district islands: placement around Nexus Prime (azimuth from north, clockwise). */
const SITES: Record<string, { az: number; dist: number; y: number; color: string; kind: 'campus' | 'dome' | 'stack' | 'spires' | 'vault' | 'tower' }> = {
  academy: { az: 80, dist: 205, y: -6, color: PALETTE.cyan, kind: 'campus' },
  soc: { az: 32, dist: 265, y: 12, color: PALETTE.eblue, kind: 'dome' },
  missions: { az: -28, dist: 235, y: -4, color: PALETTE.violet, kind: 'stack' },
  research: { az: -86, dist: 215, y: 16, color: PALETTE.ice, kind: 'spires' },
  vault: { az: -142, dist: 270, y: -12, color: PALETTE.violet, kind: 'vault' },
  comms: { az: 148, dist: 245, y: 6, color: PALETTE.cyan, kind: 'tower' },
};

/** Night silhouette material: dark navy, procedural lit window bands tinted by a per-vertex accent colour. */
function silhouetteMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#0c1428', roughness: 0.6, metalness: 0.5, emissive: '#ffffff', emissiveIntensity: 1 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aAccent; varying vec3 vCvW; varying vec3 vCvN; varying vec3 vAccent;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCvW = (modelMatrix * vec4(transformed, 1.0)).xyz; vCvN = normalize(mat3(modelMatrix) * objectNormal); vAccent = aAccent;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\nvarying vec3 vCvW; varying vec3 vCvN; varying vec3 vAccent;`)
      .replace('#include <emissivemap_fragment>', `
float side = 1.0 - abs(vCvN.y);
float floorId = floor(vCvW.y / 2.2);
float band = step(0.55, fract(vCvW.y / 2.2)) * step(fract(vCvW.y / 2.2), 0.72);
float col = floor((vCvW.x + vCvW.z) / 1.6);
float lit = step(0.62, cvHash12(vec2(floorId, col)));
float rim = smoothstep(0.92, 1.0, fract(vCvW.y / 11.0)) * 0.6;
totalEmissiveRadiance = vAccent * (band * lit * 0.55 + rim) * side;
`);
  };
  m.customProgramCacheKey = () => 'cv-silhouette';
  return m;
}

function buildDistrict(kind: string): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0) => {
    g.rotateY(ry);
    g.translate(x, y, z);
    parts.push(g.index ? g.toNonIndexed() : g);
  };
  // Floating base: tapered hull.
  add(new THREE.CylinderGeometry(26, 9, 14, 10, 1), 0, -7, 0);
  add(new THREE.CylinderGeometry(9, 1.5, 16, 10, 1), 0, -22, 0);
  switch (kind) {
    case 'campus':
      add(new THREE.BoxGeometry(18, 10, 10), -6, 5, 2);
      add(new THREE.BoxGeometry(10, 16, 10), 8, 8, -4);
      add(new THREE.CylinderGeometry(5, 5, 22, 12), 2, 11, 9);
      add(new THREE.TorusGeometry(7, 1.1, 6, 24, Math.PI), -4, 10, -8);
      break;
    case 'dome':
      add(new THREE.SphereGeometry(13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, 0);
      add(new THREE.CylinderGeometry(1.2, 1.6, 26, 8), 9, 13, 6);
      add(new THREE.BoxGeometry(8, 6, 8), -12, 3, -8);
      break;
    case 'stack':
      for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(14 - i * 2.5, 14 - i * 2.5, 5, 16), 0, 2.5 + i * 6.2, 0, i * 0.4);
      break;
    case 'spires':
      add(new THREE.ConeGeometry(4, 44, 8), 0, 22, 0);
      add(new THREE.ConeGeometry(3, 30, 8), 10, 15, 5);
      add(new THREE.ConeGeometry(3, 26, 8), -9, 13, -6);
      add(new THREE.BoxGeometry(20, 6, 12), 0, 3, 0);
      break;
    case 'vault':
      add(new THREE.BoxGeometry(16, 24, 16), 0, 12, 0, 0.4);
      add(new THREE.BoxGeometry(24, 4, 24), 0, 2, 0, 0.4);
      break;
    case 'tower':
      add(new THREE.CylinderGeometry(2.4, 4.5, 70, 10), 0, 35, 0);
      add(new THREE.TorusGeometry(8, 0.8, 6, 32).rotateX(Math.PI / 2), 0, 46, 0);
      add(new THREE.TorusGeometry(5.5, 0.6, 6, 32).rotateX(Math.PI / 2), 0, 58, 0);
      add(new THREE.BoxGeometry(14, 8, 14), 0, 4, 0);
      break;
  }
  return mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; }), false)!;
}

/** Paints a constant colour attribute on every vertex. */
function tint(g: THREE.BufferGeometry, name: string, color: THREE.Color) {
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([color.r, color.g, color.b], i * 3);
  g.setAttribute(name, new THREE.BufferAttribute(a, 3));
  return g;
}

/**
 * The six other districts as distant floating silhouettes with beacons, labels and data streams from the
 * Command Center spire. Everything is merged: 4 draw calls + 6 label sprites.
 */
export function createDistricts() {
  const group = new THREE.Group();
  group.name = 'districts';
  const silhouettes: THREE.BufferGeometry[] = [], beacons: THREE.BufferGeometry[] = [], beams: THREE.BufferGeometry[] = [], streams: THREE.BufferGeometry[] = [];
  const origin = new THREE.Vector3(0, 32.5, 0);
  for (const d of DISTRICTS) {
    const site = SITES[d.id];
    if (!site) continue;
    const accent = new THREE.Color(site.color);
    const pos = new THREE.Vector3(Math.sin(site.az * DEG) * site.dist, site.y, -Math.cos(site.az * DEG) * site.dist);
    const g = buildDistrict(site.kind);
    g.computeBoundingBox();
    const topY = pos.y + g.boundingBox!.max.y;
    silhouettes.push(tint(g.translate(pos.x, pos.y, pos.z), 'aAccent', accent));
    const top = new THREE.Vector3(pos.x, topY + 3, pos.z);
    beacons.push(tint(new THREE.SphereGeometry(1.6, 16, 8).translate(top.x, top.y, top.z), 'color', accent.clone().multiplyScalar(4)));
    beams.push(tint(new THREE.CylinderGeometry(0.8, 0.5, 180, 12, 1, true).translate(top.x, top.y + 90, top.z), 'color', accent));
    const mid = origin.clone().lerp(top, 0.5);
    mid.y += 26 + origin.distanceTo(top) * 0.08;
    const tube = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(origin, mid, top), 120, 0.22, 6, false);
    streams.push(tint(tube, 'color', new THREE.Color(d.id === 'academy' ? PALETTE.cyan : PALETTE.eblue)));
    // Floating label.
    const tex = textTexture([
      { text: d.name.toUpperCase(), size: 64, color: '#e2f7ff', weight: 700, spacing: 8 },
      { text: d.status === 'online' ? 'ONLINE' : 'UNDER CONSTRUCTION', size: 36, color: d.status === 'online' ? '#6ff3ff' : '#b39dff', weight: 600, spacing: 10 },
    ], { width: 1600, height: 260 });
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.85, blending: THREE.AdditiveBlending }));
    label.scale.set(58, 58 * (260 / 1600), 1);
    label.position.set(pos.x, topY + 14, pos.z);
    group.add(label);
  }
  const mesh = (geos: THREE.BufferGeometry[], material: THREE.Material, name: string) => {
    const m = new THREE.Mesh(mergeGeometries(geos, false)!, material);
    m.name = name;
    m.userData.noCollide = true;
    group.add(m);
  };
  mesh(silhouettes, silhouetteMaterial(), 'district-silhouettes');
  mesh(beacons, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), 'district-beacons');
  mesh(beams, beamMaterial('#ffffff', 0.55, true), 'district-beams');
  mesh(streams, streamMaterial('#ffffff', 0.85, 0.05, true), 'data-streams');
  return { group };
}
