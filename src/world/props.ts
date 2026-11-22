import * as THREE from 'three';
import { place, type Kit } from './kit';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { holoMaterial, particleMaterial, ringMaterial } from './fx';

const DEG = Math.PI / 180;

/**
 * Set dressing with a purpose: arrival pad (spawn + selection pedestals), the avenue that leads to the gate,
 * lanterns along the plaza ring, a technical uplink yard (north), hull equipment
 * under the rim, patrolling sentinel drones and floating data motes.
 */
export function createProps(mega: Kit, cyber: Kit, particles: number) {
  const staticGroup = new THREE.Group();
  const dynamic = new THREE.Group();
  const colliders = new THREE.Group();
  const S = LAYOUT.spawn;

  // ---------------- Arrival pad (spawn) + two selection pedestals
  const padRing = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.68, 128), ringMaterial(PALETTE.cyan, 2.2, 64, 0.06));
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(S.x, 0.04, S.z);
  dynamic.add(padRing);
  // The arrival pad is a floor marking (flush with the deck): outer data ring + inner ring + four ticks.
  const padInner = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.09, 96), ringMaterial(PALETTE.eblue, 1.6, 24, -0.04));
  padInner.rotation.x = -Math.PI / 2;
  padInner.position.set(S.x, 0.04, S.z);
  dynamic.add(padInner);

  // ---------------- Avenue: light blades leading north to the gate
  const bladeBody = new THREE.BoxGeometry(0.26, 3.4, 0.18).translate(0, 1.7, 0);
  const bladeLight = new THREE.BoxGeometry(0.05, 2.7, 0.05).translate(0, 1.85, 0);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#1a2440', metalness: 0.8, roughness: 0.35 });
  const lightMat = new THREE.MeshStandardMaterial({ color: '#000000', emissive: PALETTE.cyan, emissiveIntensity: 1.8 });
  const blades: [number, number][] = [];
  for (const z of [22.0, 18.4, 14.8]) for (const side of [-1, 1]) blades.push([side * 4.3, z]);
  const bodies = new THREE.InstancedMesh(bladeBody, bodyMat, blades.length);
  const lights = new THREE.InstancedMesh(bladeLight, lightMat, blades.length);
  blades.forEach(([x, z], i) => {
    const m = new THREE.Matrix4().makeTranslation(x, 0, z);
    bodies.setMatrixAt(i, m);
    lights.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x - Math.sign(x) * 0.14, 0, z));
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5));
    c.position.set(x, 2, z);
    colliders.add(c);
  });
  bodies.castShadow = true; bodies.receiveShadow = true;
  dynamic.add(bodies, lights);

  // ---------------- Lanterns along the plaza ring (skip avenue, gate and portal axes)
  for (let deg = 0; deg < 360; deg += 22.5) {
    // Skip the avenue / north yard axes and the six portal axes (portal azimuth - 90 in this angle convention).
    if ([90, 270, -60, 0, 50, 130, 180, 240].some((d) => Math.abs(((deg - d + 540) % 360) - 180) < 13)) continue;
    const a = deg * DEG;
    const r = 27.6;
    staticGroup.add(place(mega, 'Prop_Light_Floor', { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, rotY: Math.PI / 2 - a, scale: 1.3 }));
  }

  // ---------------- North uplink yard (behind the Command Center)
  const yard = new THREE.Group();
  yard.position.set(0, 0, -21);
  const yardItems: [string, number, number, number, number][] = [
    ['Antenna_1', -3.5, 0, 0, 2.8], ['Antenna_1', 3.2, 0, -1.2, 3.4], ['Antenna_1', 0.2, 0, -3.0, 4.0],
    ['AC_Stacked', -6.2, 0.68, 1.2, 1.3], ['AC_Stacked', 6.4, 0.68, 0.4, 1.3], ['Tank', -5.0, 0.55, -2.6, 1.3], ['Tank', 5.2, 0.55, -2.8, 1.3],
    ['Computer', -1.6, 0, 1.8, 1.3], ['Computer', 1.6, 0, 1.8, 1.3],
  ];
  for (const [name, x, y, z, s] of yardItems) yard.add(place(cyber, name, { x, y, z, rotY: name === 'Computer' ? Math.PI : 0, scale: s }));
  yard.add(place(mega, 'Platform_Round1', { x: 0, y: 0, z: -1, scale: [1.4, 1, 1.4] }));
  staticGroup.add(yard);
  const yardCollider = new THREE.Mesh(new THREE.BoxGeometry(15, 4, 6.5));
  yardCollider.position.set(0, 2, -21.8);
  colliders.add(yardCollider);

  // (The west observation deck was replaced by the Research Institute portal.)

  // ---------------- Hull equipment under the rim (seen from the edges and from the outpost)
  const hullItems = ['AC', 'Antenna_2', 'AC_Stacked', 'Cable_Long', 'Support_Long', 'Cable_Thick', 'AC_Side', 'Antenna_2'];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.11;
    const name = hullItems[i % hullItems.length];
    const r = name.startsWith('Cable') ? 30.6 : 29.6;
    const y = name.startsWith('Cable') ? -1.5 : -2.6;
    staticGroup.add(place(cyber, name, { x: Math.cos(a) * r, y, z: Math.sin(a) * r, rotY: -a + Math.PI / 2, scale: 2.2 }));
  }

  // ---------------- Sentinel drones (animated idle hover, patrol orbits)
  const drones: { obj: THREE.Object3D; mixer: THREE.AnimationMixer; r: number; h: number; speed: number; phase: number }[] = [];
  const idle = cyber.animations.find((a) => a.name === 'Enemy_Flying|Idle');
  for (const [r, h, speed, phase] of [[14, 13, 0.22, 0], [18, 20, 0.16, 2.1], [11, 25, -0.27, 4.2]] as const) {
    const obj = cyber.instance('Enemy_Flying');
    obj.scale.setScalar(1.6);
    const mixer = new THREE.AnimationMixer(obj);
    if (idle) mixer.clipAction(idle).play();
    drones.push({ obj, mixer, r, h, speed, phase });
    dynamic.add(obj);
  }

  // ---------------- Data motes
  const count = particles;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * 46;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 4 - 2;
    pos[i * 3 + 2] = Math.sin(a) * r;
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const motes = new THREE.Points(g, particleMaterial(0.11, Math.min(window.devicePixelRatio, 1.5)));
  motes.frustumCulled = false;
  motes.userData.noCollide = true;
  dynamic.add(motes);

  // Small hologram above the yard platform (uplink status).
  const uplink = new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.05, 120, 8, 2, 5), holoMaterial(PALETTE.violet, 1.6, { base: 0.6 }));
  uplink.position.set(0, 3.0, -22);
  dynamic.add(uplink);

  return {
    staticGroup,
    dynamic,
    colliders,
    update(dt: number, t: number) {
      padRing.rotation.z = t * 0.05;
      uplink.rotation.y = t * 0.6;
      uplink.rotation.x = t * 0.3;
      for (const d of drones) {
        const a = t * d.speed + d.phase;
        d.obj.position.set(Math.cos(a) * d.r, d.h + Math.sin(t * 0.9 + d.phase) * 0.6, Math.sin(a) * d.r);
        d.obj.rotation.y = -a + (d.speed > 0 ? 0 : Math.PI);
        d.mixer.update(dt);
      }
    },
  };
}
