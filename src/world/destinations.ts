import * as THREE from 'three';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { place, type Kit } from './kit';
import { holoMaterial, holoTextMaterial, portalMaterial, ringMaterial, textTexture } from './fx';
import { EDUCATION } from '../content/profile';

/** A walk-through portal: kit door frame + energy surface + trigger volume (in local space of `group`). */
function buildPortal(mega: Kit, label: string, sub: string) {
  const group = new THREE.Group();
  const frame = place(mega, 'Door_Frame_SquareTall', { x: 0, y: 0, z: 0, scale: 1.0 });
  group.add(frame);
  const { material, uniforms } = portalMaterial();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 4.1), material);
  surface.position.set(0, 2.08, 0);
  surface.userData.noCollide = true;
  group.add(surface);
  const glowRing = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.02, 96), ringMaterial(PALETTE.violet, 2.4, 36, 0.25));
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 0.03;
  group.add(glowRing);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.1), holoTextMaterial(textTexture([
    { text: label, size: 64, color: '#d8f8ff', weight: 700, spacing: 10 },
    { text: sub, size: 34, color: '#9fdcff', weight: 500, spacing: 6 },
  ], { width: 1400, height: 300 }), PALETTE.cyan, 1.25));
  sign.position.set(0, 5.75, 0.15);
  group.add(sign);
  const signBack = sign.clone();
  signBack.rotation.y = Math.PI;
  signBack.position.z = -0.15;
  group.add(signBack);
  // Pillar colliders (the opening itself stays free to walk through).
  const colliders = new THREE.Group();
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.2, 0.6));
    pillar.position.set(sx * 2.15, 2.6, 0);
    colliders.add(pillar);
  }
  return { group, colliders, uniforms, frame };
}

export function createDestinations(mega: Kit, cyber: Kit) {
  const staticGroup = new THREE.Group();
  const dynamic = new THREE.Group();
  const colliders = new THREE.Group();

  // ---------------- East gate on Nexus Prime (faces west, toward the plaza)
  const gate = buildPortal(mega, 'IDENTITY & ACADEMY', 'DISTRICT LINK  ·  OUTPOST');
  gate.group.position.copy(LAYOUT.portal);
  gate.group.rotation.y = -Math.PI / 2; // local +Z (front) -> world -X (plaza side)
  dynamic.add(gate.group);
  gate.colliders.position.copy(gate.group.position);
  gate.colliders.rotation.copy(gate.group.rotation);
  colliders.add(gate.colliders);
  // Gate terrace details.
  for (const dz of [-3.6, 3.6]) {
    staticGroup.add(place(mega, 'Prop_Light_Floor', { x: LAYOUT.portal.x - 1.2, y: 0, z: dz, rotY: Math.PI / 2, scale: 1.3 }));
  }

  // ---------------- Outpost (floating platform at the edge of the Academy district)
  const out = new THREE.Group();
  out.position.copy(LAYOUT.outpost);
  const platform = place(cyber, 'Platform_4x4', { x: 0, y: 0, z: 0, scale: 2.4 });
  out.add(platform);
  const top = 0.046 * 2.4;
  // Walkable top collider + containment walls (the player stands inside the fence box; its faces push back inward).
  const slab = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.4, 9.6));
  slab.position.set(0.08, top - 0.2, -0.1);
  const fence = new THREE.Mesh(new THREE.BoxGeometry(9.9, 3, 9.1));
  fence.position.set(0.08, top + 1.5, -0.1);
  const outColliders = new THREE.Group();
  outColliders.position.copy(out.position);
  outColliders.add(slab, fence);
  colliders.add(outColliders);
  // Return portal on the WEST edge, facing east: the operator arrives facing east, toward the Academy district.
  const back = buildPortal(mega, 'NEXUS PRIME', 'RETURN LINK  ·  COMMAND CENTER');
  back.group.position.set(-3.7, top, -0.1);
  back.group.rotation.y = Math.PI / 2;
  out.add(back.group);
  back.colliders.position.copy(back.group.position).add(out.position);
  back.colliders.rotation.copy(back.group.rotation);
  colliders.add(back.colliders);

  // District brief hologram (north side, angled toward the arrival point).
  const brief = new THREE.Group();
  brief.position.set(2.9, top, -3.5);
  brief.rotation.y = -0.75;
  const panelTex = textTexture([
    { text: 'IDENTITY & ACADEMY DISTRICT', size: 54, color: '#d8f8ff', weight: 700, spacing: 6 },
    { text: 'DISTRICT UNDER CONSTRUCTION', size: 30, color: '#b9a3ff', weight: 600, spacing: 8 },
    { text: ' ', size: 14 },
    ...EDUCATION.map((e) => ({ text: `${e.title}  ·  ${e.school}`, size: 27, color: '#bfe9ff', weight: 500 })),
  ], { width: 1500, height: 560 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.72), holoTextMaterial(panelTex, '#ffffff', 1.15));
  panel.position.y = 2.15;
  brief.add(panel);
  const panelFrame = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.9), holoMaterial(PALETTE.eblue, 0.22, { base: 0.6, scan: 30 }));
  panelFrame.position.set(0, 2.15, -0.02);
  brief.add(panelFrame);
  brief.add(place(cyber, 'Computer', { x: 0, y: 0, z: 0.25, scale: 1.3 }));
  out.add(brief);
  // Wireframe preview of the future district.
  const preview = new THREE.Group();
  preview.position.set(2.4, top + 0.6, 2.6);
  const wire = holoMaterial(PALETTE.cyan, 1.1, { base: 0.9 });
  const shapes: [THREE.BufferGeometry, number, number, number][] = [
    [new THREE.BoxGeometry(1.2, 0.9, 0.8), -0.5, 0.45, 0],
    [new THREE.CylinderGeometry(0.35, 0.45, 1.6, 8), 0.55, 0.8, -0.2],
    [new THREE.BoxGeometry(0.6, 0.5, 1.1), 0.3, 0.25, 0.5],
    [new THREE.TorusGeometry(0.5, 0.03, 6, 24), -0.4, 1.25, 0],
  ];
  for (const [g, x, y, z] of shapes) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), wire);
    l.position.set(x, y, z);
    preview.add(l);
  }
  const previewBase = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.12, 64), ringMaterial(PALETTE.cyan, 2, 24, 0.2));
  previewBase.rotation.x = -Math.PI / 2;
  previewBase.position.y = -0.55;
  preview.add(previewBase);
  out.add(preview);
  out.add(place(cyber, 'Turret_Teleporter', { x: 2.4, y: top, z: 2.6, scale: 1.8 }));
  dynamic.add(out);

  // Trigger volumes (world space).
  const gateTrigger = new THREE.Box3(
    new THREE.Vector3(LAYOUT.portal.x - 0.45, -1, -1.75), new THREE.Vector3(LAYOUT.portal.x + 0.45, 4, 1.75));
  const outGatePos = new THREE.Vector3(-3.7, top, -0.1).add(LAYOUT.outpost);
  const backTrigger = new THREE.Box3(
    new THREE.Vector3(outGatePos.x - 0.45, outGatePos.y - 1, outGatePos.z - 1.75), new THREE.Vector3(outGatePos.x + 0.45, outGatePos.y + 4, outGatePos.z + 1.75));

  return {
    staticGroup,
    dynamic,
    colliders,
    gateTrigger,
    backTrigger,
    // Arrival points are far enough from the portal that the third-person camera stays in front of it.
    /** Outpost: 5.3 m east of the return portal, facing east (toward the Academy district). */
    outpostArrival: { position: outGatePos.clone().add(new THREE.Vector3(5.3, 0, 0)), yaw: Math.PI / 2 },
    /** Nexus Prime: 5.6 m west of the east gate, facing west (toward the plaza and the Command Center). */
    gateArrival: { position: LAYOUT.portal.clone().add(new THREE.Vector3(-5.6, 0, 0)), yaw: -Math.PI / 2 },
    briefPosition: new THREE.Vector3().copy(brief.position).add(LAYOUT.outpost),
    surge(which: 'gate' | 'back', v: number) { (which === 'gate' ? gate : back).uniforms.uSurge.value = v; },
    update(_dt: number, t: number) {
      preview.rotation.y = t * 0.35;
    },
  };
}
