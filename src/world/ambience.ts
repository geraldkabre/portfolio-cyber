import * as THREE from 'three';
import { FX_TIME, particleMaterial } from './fx';
import { SITES, siteXZ } from './campus';
import { LAYOUT } from './layout';

/**
 * Atmosphere layer of the Sentinel Nexus (no new assets, five draw calls):
 * - an underglow halo beneath every island, so each floating platform separates from the cloud sea at any distance;
 * - drifting data motes around the district island the operator is on (Nexus Prime has its own in props.ts).
 * Particle counts follow the quality preset (0 on low).
 */
const DISTRICT_RADIUS = LAYOUT.islandRadius * 0.45;

function haloMaterial(color: THREE.ColorRepresentation, intensity: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: FX_TIME, uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vDist;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uIntensity;
      varying vec2 vUv; varying float vDist;
      void main() {
        float r = length(vUv - 0.5) * 2.0;               // 0 centre -> 1 edge of the quad
        float body = smoothstep(1.0, 0.42, r);            // soft falloff outward
        float core = smoothstep(0.34, 0.47, r);           // hollow under the deck (hidden by it anyway)
        float breathe = 0.85 + 0.15 * sin(uTime * 0.6);
        float far = 1.0 - smoothstep(260.0, 420.0, vDist); // fades into the night haze
        gl_FragColor = vec4(uColor * body * core * breathe * far * uIntensity, 1.0);
      }`,
  });
}

export function createAmbience(particles: number) {
  const group = new THREE.Group();
  group.name = 'ambience';

  // ---- Underglow halos (Nexus Prime + six districts).
  const halo = (x: number, y: number, z: number, radius: number, color: string, intensity: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMaterial(color, intensity));
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(radius * 4.4);
    m.position.set(x, y, z);
    m.renderOrder = -1;
    m.frustumCulled = true;
    group.add(m);
    return m;
  };
  halo(0, -2.2, 0, LAYOUT.islandRadius, '#3a5bff', 0.32);
  for (const s of SITES) {
    const p = siteXZ(s.az, s.dist);
    halo(p.x, s.y - 1.4, p.z, DISTRICT_RADIUS, s.color, 0.3);
  }

  // ---- District motes (one Points object that moves to the active district).
  const count = Math.round(particles * 0.45);
  let motes: THREE.Points | null = null;
  if (count > 0) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * (DISTRICT_RADIUS + 6);
      const a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, Math.random() * 4 - 2, Math.sin(a) * r], i * 3);
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    motes = new THREE.Points(g, particleMaterial(0.1, Math.min(window.devicePixelRatio, 1.5)));
    motes.frustumCulled = false;
    motes.visible = false;
    group.add(motes);
  }

  return {
    group,
    /** Places the motes on the active district (Nexus Prime already has its own field). */
    setActive(id: string) {
      if (!motes) return;
      const s = SITES.find((x) => x.id === id);
      motes.visible = !!s;
      if (s) {
        const p = siteXZ(s.az, s.dist);
        motes.position.set(p.x, s.y, p.z);
      }
    },
  };
}
