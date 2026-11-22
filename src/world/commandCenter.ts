import * as THREE from 'three';
import { castShadows, place, type Kit } from './kit';
import type { MaterialLibrary } from './materials';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { polySlab } from './geometry';
import { beamMaterial, energyMaterial, holoMaterial, holoTextMaterial, ringMaterial, textTexture } from './fx';

const DEG = Math.PI / 180;

/**
 * The Command Center ("Sentinel Spire"): a 12-sided glass rotunda (tier 1), an 8-sided armoured drum with
 * clerestory windows (tier 2) and a 15 m spire around an energy core, topped by the Sentinel eye and a sky beam.
 * Kit wall panels are single-sided interior panels; they are oriented with the detailed face OUTWARD.
 */
export function createCommandCenter(mega: Kit, lib: MaterialLibrary) {
  const staticGroup = new THREE.Group();
  staticGroup.name = 'cc-static';
  const dynamic = new THREE.Group();
  dynamic.name = 'cc-dynamic';
  const colliders = new THREE.Group();
  const s = LAYOUT.cc.scale;
  const base = LAYOUT.plinthTop;

  // ---------------- Tier 1: glass rotunda
  const n1 = LAYOUT.cc.sides;
  const a1 = LAYOUT.cc.inradius;            // 9.33 m
  const R1 = LAYOUT.cc.sideLength / (2 * Math.sin(Math.PI / n1));
  const h1 = LAYOUT.cc.tier1Height;          // 3.99 m
  const entranceTheta = 90 * DEG;            // south (+Z)
  for (let k = 0; k < n1; k++) {
    const theta = entranceTheta + k * (360 / n1) * DEG;
    const nx = Math.cos(theta), nz = Math.sin(theta);
    const isEntrance = k === 0;
    if (!isEntrance) {
      // Wall plane at local x = -2 (scaled): origin = (a + 2s) n, local +x -> outward.
      staticGroup.add(place(mega, 'WallWindow_Straight', { x: nx * (a1 + 2 * s), y: base, z: nz * (a1 + 2 * s), rotY: -theta, scale: s }));
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, LAYOUT.cc.sideLength + 0.3));
      box.position.set(nx * (a1 - 0.05), base + 2.1, nz * (a1 - 0.05));
      box.rotation.y = -theta;
      colliders.add(box);
    }
    // Vertex fins.
    const tv = theta + (180 / n1) * DEG;
    staticGroup.add(place(mega, 'Column_Astra', {
      x: Math.cos(tv) * R1, y: base, z: Math.sin(tv) * R1, rotY: Math.PI / 2 - tv + Math.PI, scale: [s, h1 / 3.02, s],
    }));
  }
  // Roof slab + glowing fascia.
  const roofY0 = base + h1, roofY1 = roofY0 + 0.46;
  const roofRot = entranceTheta + (180 / n1) * DEG;
  const roof1 = new THREE.Mesh(polySlab(n1, R1 + 0.75, roofY0, roofY1, roofRot), lib.role('hull'));
  roof1.castShadow = true; roof1.receiveShadow = true;
  staticGroup.add(roof1);
  colliders.add(new THREE.Mesh(roof1.geometry));
  const fascia = new THREE.Mesh(polySlab(n1, R1 + 0.78, roofY0 + 0.17, roofY0 + 0.25, roofRot), lib.role('accent'));
  staticGroup.add(fascia);
  // Interior ceiling light ring.
  const ceilingRing = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.06, 8, 96).rotateX(Math.PI / 2), lib.role('light'));
  ceilingRing.position.y = roofY0 - 0.12;
  staticGroup.add(ceilingRing);

  // Grand gate (south): tall door frame in front of the rotunda + two sliding leaves.
  const gateR = R1 + 1.1;
  const gate = place(mega, 'Door_Frame_SquareTall', { x: 0, y: base, z: gateR, rotY: 0, scale: s });
  staticGroup.add(gate);
  const leafL = place(mega, 'Door_Metal', { x: 0, y: base, z: gateR - 0.06, scale: s });
  const leafR = place(mega, 'Door_Metal', { x: 0, y: base, z: gateR - 0.06, scale: [-s, s, s] });
  dynamic.add(leafL, leafR);
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 6.3, 0.9));
    pillar.position.set(sx * 2.95, base + 3.1, gateR);
    colliders.add(pillar);
  }
  // Invisible side colliders between the gate and the rotunda (the vestibule stays open to the eye).
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, h1, 1.9));
    wall.position.set(sx * 2.85, base + h1 / 2, gateR - 1.05);
    colliders.add(wall);
  }
  // Light seams on the inner edges of the two leaves (they slide with the doors).
  for (const leaf of [leafL, leafR]) {
    // Leaf space is scaled by 1.25 (and mirrored for the right leaf): local x = 0 is the inner edge.
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.9, 0.04), lib.role('accent'));
    seam.position.set(-0.04, 2.0, 0.13);
    leaf.add(seam);
  }
  // Gate: glowing outline inside the frame opening.
  const outline = lib.role('accent');
  for (const [w, h, x, y] of [[0.07, 5.1, -2.66, 2.55], [0.07, 5.1, 2.66, 2.55], [5.39, 0.07, 0, 5.1]] as const) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), outline);
    bar.position.set(x, base + y, gateR + 0.2);
    staticGroup.add(bar);
  }
  // Gate sign.
  const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.95), holoTextMaterial(textTexture([
    { text: 'COMMAND CENTER', size: 92, color: '#bff6ff', weight: 700, spacing: 18 },
  ], { width: 1400, height: 220 }), PALETTE.cyan, 1.35));
  gateSign.position.set(0, base + 6.75, gateR + 0.35);
  dynamic.add(gateSign);

  // ---------------- Tier 2: armoured drum with clerestory
  const n2 = 8;
  const a2 = LAYOUT.cc.sideLength / (2 * Math.tan(Math.PI / n2));
  const R2 = LAYOUT.cc.sideLength / (2 * Math.sin(Math.PI / n2));
  const base2 = roofY1;
  for (let k = 0; k < n2; k++) {
    const theta = entranceTheta + k * (360 / n2) * DEG;
    const nx = Math.cos(theta), nz = Math.sin(theta);
    staticGroup.add(place(mega, k % 2 === 0 ? 'WallAstra_Straight' : 'WallAstra_Straight_Divided', {
      x: nx * (a2 + 2 * s), y: base2, z: nz * (a2 + 2 * s), rotY: -theta, scale: s,
    }));
    staticGroup.add(place(mega, 'TopWindow_Straight', { x: nx * (a2 + 2 * s), y: base2, z: nz * (a2 + 2 * s), rotY: -theta, scale: s }));
    const tv = theta + (180 / n2) * DEG;
    staticGroup.add(place(mega, 'Column_Simple', {
      x: Math.cos(tv) * (R2 + 0.1), y: base2, z: Math.sin(tv) * (R2 + 0.1), rotY: Math.PI / 2 - tv, scale: [s, 6.3 / 5, s],
    }));
  }
  const top2 = base2 + 5.02 * s;
  const roof2 = new THREE.Mesh(polySlab(n2, R2 + 0.6, top2, top2 + 0.42, entranceTheta + (180 / n2) * DEG), lib.role('hull'));
  roof2.castShadow = true; roof2.receiveShadow = true;
  staticGroup.add(roof2);
  const fascia2 = new THREE.Mesh(polySlab(n2, R2 + 0.63, top2 + 0.15, top2 + 0.22, entranceTheta + (180 / n2) * DEG), lib.role('accent'));
  staticGroup.add(fascia2);

  // ---------------- Spire
  const spireBase = top2 + 0.42;
  const spireH = 15;
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * DEG;
    staticGroup.add(place(mega, 'Column_Large_Straight', {
      x: Math.cos(a) * 2.7, y: spireBase, z: Math.sin(a) * 2.7, rotY: Math.PI / 2 - a, scale: [1.25, spireH / 10, 1.25],
    }));
    // Light vein on the outer face of each spire column.
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.09, spireH - 1.2, 0.09), lib.role('accent'));
    vein.position.set(Math.cos(a) * 4.17, spireBase + spireH / 2, Math.sin(a) * 4.17);
    staticGroup.add(vein);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, spireH + 1.2, 32, 1, true), energyMaterial(PALETTE.cyan, 2.4));
  core.position.y = spireBase + (spireH + 1.2) / 2;
  dynamic.add(core);
  const coreInner = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, spireH + 1.2, 16, 1, true), holoMaterial(PALETTE.ice, 2.2, { base: 0.9 }));
  coreInner.position.copy(core.position);
  dynamic.add(coreInner);
  // Crown + Sentinel eye.
  const crownY = spireBase + spireH;
  staticGroup.add(place(mega, 'Platform_Round1', { x: 0, y: crownY, z: 0, scale: [0.95, 1.6, 0.95] }));
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#000000', emissive: PALETTE.cyan, emissiveIntensity: 5, flatShading: true });
  const eye = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), eyeMat);
  eye.position.y = crownY + 2.6;
  dynamic.add(eye);
  const eyeShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), holoMaterial(PALETTE.eblue, 1.1, { base: 0.05 }));
  eyeShell.position.copy(eye.position);
  dynamic.add(eyeShell);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.25, 260, 24, 1, true), beamMaterial(PALETTE.cyan, 0.9));
  beam.geometry.translate(0, 130, 0);
  // Cylinder uv.y goes 0 (bottom) -> 1 (top) after the default generation: keep.
  beam.position.y = crownY + 3.2;
  dynamic.add(beam);

  // Holographic rings around the spire.
  const rings: THREE.Mesh[] = [];
  [[spireBase + 3.2, 4.9, 0.16, 0.05, PALETTE.cyan], [spireBase + 7.4, 4.1, 0.12, -0.08, PALETTE.eblue], [spireBase + 11.4, 3.4, 0.1, 0.12, PALETTE.violet]]
    .forEach(([y, r, w, speed, col]) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r as number, (r as number) + (w as number), 128, 1), ringMaterial(col as string, 2.4, 56, speed as number));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = y as number;
      ring.userData.spin = speed;
      rings.push(ring);
      dynamic.add(ring);
    });

  // ---------------- Interior: holo dais + operator consoles
  staticGroup.add(place(mega, 'Platform_Round1', { x: 0, y: base, z: 0, scale: [0.72, 1.0, 0.72] }));
  const holo = new THREE.Group();
  holo.position.set(0, base + 2.05, 0);
  const globe = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.95, 2)), holoMaterial(PALETTE.cyan, 1.4, { base: 0.8 }));
  holo.add(globe);
  const globeCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), holoMaterial(PALETTE.eblue, 1.6, { base: 0.4 }));
  holo.add(globeCore);
  for (let i = 0; i < 3; i++) {
    const orbit = new THREE.Mesh(new THREE.RingGeometry(1.2 + i * 0.18, 1.235 + i * 0.18, 96), ringMaterial(i === 1 ? PALETTE.violet : PALETTE.cyan, 2.0, 24, 0.2 + i * 0.1));
    orbit.rotation.set(-Math.PI / 2 + (i - 1) * 0.35, 0, i * 0.8);
    holo.add(orbit);
  }
  const holoLabel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), holoTextMaterial(textTexture([
    { text: 'OPERATOR DOSSIER', size: 70, color: '#c8f7ff', weight: 700, spacing: 12 },
  ], { width: 1100, height: 170 }), PALETTE.cyan, 1.2));
  holoLabel.position.set(0, 1.42, 0);
  holo.add(holoLabel);
  dynamic.add(holo);
  const daisCollider = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 3.2, 24));
  daisCollider.position.set(0, base + 1.6, 0);
  colliders.add(daisCollider);

  // Consoles facing the dais (skip the entrance direction).
  for (const deg of [30, 150, 210, 270, 330]) {
    const a = deg * DEG;
    const r = 6.2;
    const c = place(mega, 'Prop_Computer', { x: Math.cos(a) * r, y: base, z: Math.sin(a) * r, rotY: -Math.PI / 2 - a, scale: 1.15 });
    staticGroup.add(c);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 0.9));
    box.position.set(Math.cos(a) * r, base + 1.3, Math.sin(a) * r);
    box.rotation.y = -a;
    colliders.add(box);
  }

  // Floor uplights around the rotunda (skip the gate).
  for (let k = 1; k < n1; k++) {
    const tv = entranceTheta + k * (360 / n1) * DEG;
    staticGroup.add(place(mega, 'Prop_Light_Floor', { x: Math.cos(tv) * (a1 + 0.75), y: base, z: Math.sin(tv) * (a1 + 0.75), rotY: Math.PI / 2 - tv, scale: 1.1 }));
  }

  const interiorLight = new THREE.PointLight(PALETTE.cyan, 38, 16, 2);
  interiorLight.position.set(0, base + 3.0, 0);
  dynamic.add(interiorLight);

  // Architecture casts moon shadows; interior props and small details do not (cheaper shadow pass).
  for (const piece of staticGroup.children) {
    if (/^(Wall|Column|Door_Frame|TopWindow|Platform_Round1)/.test(piece.name) && piece.position.y < 30) castShadows(piece);
  }

  // ---------------- Behaviour
  let doorOpen = 0;
  const doorTarget = { value: 0 };
  const gatePos = new THREE.Vector3(0, base, gateR);

  return {
    staticGroup,
    dynamic,
    colliders,
    gatePosition: gatePos,
    dossierPosition: new THREE.Vector3(0, base, 0),
    setDoorWanted(open: boolean) { doorTarget.value = open ? 1 : 0; },
    get doorOpen() { return doorOpen; },
    update(dt: number, t: number) {
      doorOpen += (doorTarget.value - doorOpen) * Math.min(1, dt * 3.2);
      const slide = doorOpen * 2.45 * s;
      leafL.position.x = -slide;
      leafR.position.x = slide;
      eye.rotation.y = t * 0.6;
      eye.rotation.x = Math.sin(t * 0.5) * 0.2;
      eye.position.y = crownY + 2.6 + Math.sin(t * 1.1) * 0.18;
      eyeShell.rotation.y = -t * 0.25;
      eyeShell.position.y = eye.position.y;
      eyeMat.emissiveIntensity = 4.5 + Math.sin(t * 2.2) * 0.8;
      for (const r of rings) r.rotation.z = t * (r.userData.spin as number);
      holo.rotation.y = t * 0.25;
      globe.rotation.y = t * 0.1;
      holoLabel.rotation.y = -t * 0.25; // keep the label readable while the hologram spins
    },
  };
}
