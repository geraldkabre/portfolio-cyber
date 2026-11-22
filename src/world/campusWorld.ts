import * as THREE from 'three';
import { castShadows, place, type Kit } from './kit';
import type { MaterialLibrary } from './materials';
import { createIsland } from './island';
import { batchStatic } from './batch';
import { PALETTE } from './palette';
import { holoMaterial, holoTextMaterial, portalMaterial, ringMaterial, textTexture } from './fx';
import { PORTAL_RING, SITES, siteXZ, type Site } from './campus';
import {
  CERTIFICATES, DISTRICTS, EDUCATION, EXPERIENCE, PROFILE, PROJECTS, RESEARCH, ROOTME, SKILLS, certificateImage,
  type PanelKey,
} from '../content/profile';

const DEG = Math.PI / 180;
/** District islands are a 0.45 scale of Nexus Prime (walkable radius ~14 m). */
const DISTRICT_SCALE = 0.45;

export interface Portal {
  id: string;
  /** Inverse world matrix of the portal plane (trigger test in local space). */
  inverse: THREE.Matrix4;
  to: string;
  uniforms: { uSurge: { value: number } };
}

export interface Arrival { position: THREE.Vector3; yaw: number }

export interface Terminal { id: string; panel: PanelKey; position: THREE.Vector3; radius: number; prompt: string }

const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz);
const loader = new THREE.TextureLoader();

function imageTexture(url: string) {
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Walk-through portal: kit door frame + energy surface + two-sided label. Local +Z is the front. */
function buildPortal(mega: Kit, label: string, sub: string, color: string) {
  const group = new THREE.Group();
  const frame = castShadows(place(mega, 'Door_Frame_SquareTall', { x: 0, y: 0, z: 0, scale: 1.0 }));
  group.add(frame);
  const { material, uniforms } = portalMaterial();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 4.1), material);
  surface.position.set(0, 2.08, 0);
  surface.userData.noCollide = true;
  group.add(surface);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.02, 96), ringMaterial(color, 2.4, 36, 0.25));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);
  const tex = textTexture([
    { text: label, size: 60, color: '#d8f8ff', weight: 700, spacing: 8 },
    { text: sub, size: 32, color: '#9fdcff', weight: 500, spacing: 5 },
  ], { width: 1400, height: 300 });
  for (const back of [false, true]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.16), holoTextMaterial(tex, color, 1.25));
    sign.position.set(0, 5.75, back ? -0.15 : 0.15);
    if (back) sign.rotation.y = Math.PI;
    group.add(sign);
  }
  const colliders = new THREE.Group();
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.2, 0.6));
    pillar.position.set(sx * 2.15, 2.6, 0);
    colliders.add(pillar);
  }
  // Lintel: above head height (does not block walking) but stops the camera from sliding into the frame.
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.8, 0.6));
  lintel.position.set(0, 4.6, 0);
  colliders.add(lintel);
  return { group, colliders, uniforms };
}

/** Holographic text panel (canvas texture) with a faint frame. */
function textPanel(lines: Parameters<typeof textTexture>[0], w: number, h: number, opts: { align?: CanvasTextAlign; color?: string; px?: number } = {}) {
  const px = opts.px ?? 1400;
  const g = new THREE.Group();
  const tex = textTexture(lines, { width: px, height: Math.round(px * (h / w)), align: opts.align, padding: 70 });
  const text = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoTextMaterial(tex, '#ffffff', 1.15));
  g.add(text);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.16, h + 0.16), holoMaterial(opts.color ?? PALETTE.eblue, 0.2, { base: 0.6, scan: 26 }));
  frame.position.z = -0.02;
  g.add(frame);
  return g;
}

/** Framed image "screen" (unlit, so the real document stays readable). */
function imagePanel(url: string, w: number, h: number, color: string = PALETTE.cyan) {
  const g = new THREE.Group();
  const img = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: imageTexture(url), toneMapped: false, color: '#d9e2f2' }));
  g.add(img);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.18, h + 0.18), holoMaterial(color, 0.9, { base: 0.9, scan: 30 }));
  frame.position.z = -0.03;
  g.add(frame);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.24, h + 0.24), new THREE.MeshStandardMaterial({ color: '#0a1226', metalness: 0.6, roughness: 0.4 }));
  back.position.z = -0.06;
  back.rotation.y = Math.PI;
  g.add(back);
  return g;
}

/** Wall pieces on a partial polygon around the local origin, detailed face toward the centre. */
function gallery(mega: Kit, piece: string, sides: number, ks: number[], scale = 1) {
  const g = new THREE.Group();
  const a = (4 * scale) / (2 * Math.tan(Math.PI / sides));
  for (const k of ks) {
    const theta = (k * 360) / sides * DEG;
    const nx = Math.cos(theta), nz = Math.sin(theta);
    g.add(castShadows(place(mega, piece, { x: nx * (a - 2 * scale), y: 0, z: nz * (a - 2 * scale), rotY: Math.PI - theta, scale })));
  }
  return { group: g, inradius: a };
}

interface DistrictBuild {
  static: THREE.Group;
  dynamic: THREE.Group;
  colliders: THREE.Group;
  terminal: THREE.Vector3; // local
  update?: (t: number) => void;
}

function terminalProp(cyber: Kit, x: number, z: number, rotY: number, color: string) {
  const g = new THREE.Group();
  g.add(place(cyber, 'Computer', { x, y: 0, z, rotY, scale: 1.5 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.03, 64), ringMaterial(color, 2.2, 24, 0.2));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.04, z);
  g.add(ring);
  return g;
}

/** --------------------------------------------------------------- district landmarks (local frame: +Z faces Nexus Prime) */
function buildAcademy(mega: Kit, cyber: Kit, site: Site): DistrictBuild {
  const st = new THREE.Group(), dyn = new THREE.Group(), col = new THREE.Group();
  const wall = gallery(mega, 'WallWindow_Straight', 12, [7, 8, 10, 11]);
  wall.group.position.z = -1;
  st.add(wall.group);
  // Academy gate in the middle of the gallery (the wall piece behind it is left out).
  st.add(castShadows(place(mega, 'Door_Frame_SquareTall', { x: 0, y: 0, z: -8.6, scale: 1.0 })));
  const collider = new THREE.Mesh(new THREE.CylinderGeometry(wall.inradius + 0.3, wall.inradius + 0.3, 4, 24, 1, true, 105 * DEG, 150 * DEG));
  collider.position.z = -1;
  col.add(collider);
  // Education timeline as four holographic plaques along the gallery, plus languages.
  EDUCATION.forEach((e, i) => {
    const ang = (-150 + i * 40) * DEG;
    const p = textPanel([
      { text: e.period.toUpperCase(), size: 44, color: '#6ff3ff', weight: 700, spacing: 6 },
      { text: e.title, size: 46, color: '#ffffff', weight: 600 },
      { text: e.school, size: 38, color: '#bfe9ff', weight: 500 },
    ], 2.6, 1.15, { color: site.color });
    p.position.set(Math.cos(ang) * 5.6, 2.0, -1 + Math.sin(ang) * 5.6);
    p.rotation.y = yawOf(-Math.cos(ang), -Math.sin(ang));
    dyn.add(p);
  });
  const langs = textPanel([
    { text: 'LANGUAGES', size: 46, color: '#6ff3ff', weight: 700, spacing: 8 },
    ...PROFILE.languages.map((l) => ({ text: `${l.name} — ${l.level}`, size: 38, color: '#ffffff', weight: 500 })),
  ], 3.2, 1.25, { color: site.color });
  langs.position.set(0, 5.6, -9.2);
  dyn.add(langs);
  st.add(terminalProp(cyber, 3.2, 1.2, -0.6, site.color));
  return { static: st, dynamic: dyn, colliders: col, terminal: new THREE.Vector3(3.2, 0, 1.2) };
}

function buildSoc(mega: Kit, cyber: Kit, site: Site): DistrictBuild {
  const st = new THREE.Group(), dyn = new THREE.Group(), col = new THREE.Group();
  st.add(castShadows(place(mega, 'Platform_Round1', { x: 0, y: 0, z: -4.5, scale: [1.1, 1.2, 1.1] })));
  for (let k = 0; k < 6; k++) {
    const a = (200 + k * 28) * DEG;
    st.add(castShadows(place(mega, 'Prop_Computer', { x: Math.cos(a) * 5.8, y: 0, z: -4.5 + Math.sin(a) * 5.8, rotY: -Math.PI / 2 - a, scale: 1.15 })));
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.8));
    b.position.set(Math.cos(a) * 5.8, 1, -4.5 + Math.sin(a) * 5.8);
    col.add(b);
  }
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3, 24));
  dais.position.set(0, 1.5, -4.5);
  col.add(dais);
  // Network hologram: pfSense firewall at the centre, five isolated VLANs, Dual-WAN uplinks.
  const net = new THREE.Group();
  net.position.set(0, 2.6, -4.5);
  const fw = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), holoMaterial(PALETTE.cyan, 2.2, { base: 0.9 }));
  net.add(fw);
  const vlans = ['VLAN 10 · ADMIN', 'VLAN 20 · LAB', 'VLAN 30 · STUDENTS', 'VLAN 40 · GUESTS', 'VLAN 50 · DMZ'];
  const lineMat = new THREE.LineBasicMaterial({ color: PALETTE.eblue, transparent: true, opacity: 0.8 });
  vlans.forEach((name, i) => {
    const a = (i / vlans.length) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * 1.9, Math.sin(i * 1.7) * 0.25, Math.sin(a) * 1.9);
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8), holoMaterial(i === 4 ? PALETTE.violet : PALETTE.eblue, 2.0, { base: 0.9 }));
    node.position.copy(p);
    net.add(node);
    net.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), p]), lineMat));
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture([{ text: name, size: 52, color: '#d8f8ff', weight: 700 }], { width: 640, height: 96 }), transparent: true, depthWrite: false }));
    label.scale.set(1.5, 0.225, 1);
    label.position.copy(p).add(new THREE.Vector3(0, 0.36, 0));
    net.add(label);
  });
  for (const sx of [-1, 1]) {
    const wan = new THREE.Vector3(sx * 0.9, 1.6, 0);
    net.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), wan]), new THREE.LineBasicMaterial({ color: PALETTE.cyan })));
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 6), holoMaterial(PALETTE.cyan, 2, { base: 1 }));
    n.position.copy(wan);
    net.add(n);
  }
  const shield = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.6, 1)), holoMaterial(PALETTE.eblue, 0.6, { base: 0.5 }));
  net.add(shield);
  dyn.add(net);
  const sec = textPanel([
    { text: 'SECURITY', size: 48, color: '#6ff3ff', weight: 700, spacing: 8 },
    ...SKILLS.security.map((s) => ({ text: s, size: 36, color: '#ffffff', weight: 500 })),
  ], 2.6, 2.6, { color: site.color });
  sec.position.set(-4.6, 2.4, -10.2);
  sec.rotation.y = 0.35;
  dyn.add(sec);
  const dev = textPanel([
    { text: 'DEVELOPMENT', size: 48, color: '#6ff3ff', weight: 700, spacing: 8 },
    ...SKILLS.development.map((d) => ({ text: `${d.name} — ${d.level}`, size: 34, color: '#ffffff', weight: 500 })),
  ], 2.6, 2.6, { color: site.color });
  dev.position.set(4.6, 2.4, -10.2);
  dev.rotation.y = -0.35;
  dyn.add(dev);
  st.add(terminalProp(cyber, 3.4, 1.0, -0.6, site.color));
  return {
    static: st, dynamic: dyn, colliders: col, terminal: new THREE.Vector3(3.4, 0, 1.0),
    update: (t) => { net.rotation.y = t * 0.18; fw.rotation.y = t * 1.2; shield.rotation.y = -t * 0.05; },
  };
}

function buildMissions(mega: Kit, cyber: Kit, site: Site): DistrictBuild {
  const st = new THREE.Group(), dyn = new THREE.Group(), col = new THREE.Group();
  PROJECTS.forEach((p, i) => {
    const x = (i - 1) * 5.3;
    st.add(castShadows(place(mega, 'Door_Frame_SquareTall', { x, y: 0, z: -8.6, scale: 1.05 })));
    const done = p.status === 'completed';
    const card = textPanel([
      { text: done ? 'COMPLETED' : 'IN PROGRESS', size: 40, color: done ? '#6ff3ff' : '#c4b0ff', weight: 700, spacing: 8 },
      { text: p.title.split(' — ')[0], size: 44, color: '#ffffff', weight: 600 },
      { text: p.title.split(' — ')[1] ?? '', size: 36, color: '#bfe9ff', weight: 500 },
    ], 3.3, 1.7, { color: done ? PALETTE.cyan : PALETTE.violet });
    card.position.set(x, 2.3, -8.35);
    dyn.add(card);
    const b = new THREE.Mesh(new THREE.BoxGeometry(5.2, 5.4, 0.8));
    b.position.set(x, 2.7, -8.6);
    col.add(b);
  });
  const exp = textPanel([
    { text: 'EXPERIENCE', size: 46, color: '#6ff3ff', weight: 700, spacing: 8 },
    ...EXPERIENCE.map((e) => ({ text: `${e.title} — ${e.tags.slice(0, 3).join(', ')}`, size: 34, color: '#ffffff', weight: 500 })),
  ], 3.6, 1.5, { color: site.color });
  exp.position.set(-5.6, 2.0, -3.4);
  exp.rotation.y = 0.9;
  dyn.add(exp);
  st.add(terminalProp(cyber, 3.4, 0.8, -0.6, site.color));
  return { static: st, dynamic: dyn, colliders: col, terminal: new THREE.Vector3(3.4, 0, 0.8) };
}

function buildResearch(mega: Kit, cyber: Kit, site: Site): DistrictBuild {
  const st = new THREE.Group(), dyn = new THREE.Group(), col = new THREE.Group();
  for (const x of [-4.6, 4.6]) {
    st.add(castShadows(place(mega, 'Column_Large_Straight', { x, y: 0, z: -9.2, rotY: Math.PI, scale: [1, 0.75, 1] })));
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8, 2.2));
    b.position.set(x, 4, -9.2);
    col.add(b);
  }
  const before = imagePanel(RESEARCH.figures[0].src, 3.4, 2.0, site.color);
  before.position.set(-1.85, 4.3, -9.0);
  const after = imagePanel(RESEARCH.figures[1].src, 3.4, 1.77, site.color);
  after.position.set(1.85, 4.3, -9.0);
  dyn.add(before, after);
  RESEARCH.figures.slice(2).forEach((f, i) => {
    const p = imagePanel(f.src, 2.3, 1.15, site.color);
    p.position.set((i - 1) * 2.55, 1.75, -9.0);
    dyn.add(p);
  });
  const title = textPanel([
    { text: 'BACHELOR’S THESIS · CO-WRITTEN · COMPLETED', size: 36, color: '#6ff3ff', weight: 700, spacing: 6 },
    { text: 'pfSense-based network security solution', size: 50, color: '#ffffff', weight: 600 },
    { text: 'UMET-Burkina · ISO/IEC 27005 risk analysis · VMware lab', size: 34, color: '#bfe9ff', weight: 500 },
  ], 6.2, 1.05, { color: site.color });
  title.position.set(0, 6.25, -9.0);
  dyn.add(title);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 5.6, 0.4), new THREE.MeshStandardMaterial({ color: '#0b1428', metalness: 0.7, roughness: 0.35 }));
  wall.position.set(0, 3.4, -9.35);
  st.add(castShadows(wall));
  col.add(new THREE.Mesh(wall.geometry.clone().translate(0, 3.4, -9.35)));
  st.add(terminalProp(cyber, 3.4, 0.8, -0.6, site.color));
  return { static: st, dynamic: dyn, colliders: col, terminal: new THREE.Vector3(3.4, 0, 0.8) };
}

function buildVault(_mega: Kit, cyber: Kit, site: Site): DistrictBuild {
  const st = new THREE.Group(), dyn = new THREE.Group(), col = new THREE.Group();
  const mono = new THREE.Mesh(new THREE.BoxGeometry(9.2, 6.6, 2.4), new THREE.MeshStandardMaterial({ color: '#0a1124', metalness: 0.8, roughness: 0.3, emissive: '#1a0c44', emissiveIntensity: 0.4 }));
  mono.position.set(0, 3.3, -9.6);
  st.add(castShadows(mono));
  col.add(new THREE.Mesh(mono.geometry.clone().translate(0, 3.3, -9.6)));
  const seam = new THREE.MeshStandardMaterial({ color: '#000000', emissive: site.color, emissiveIntensity: 2.2 });
  for (const [w, h, x, y] of [[9.3, 0.06, 0, 6.62], [9.3, 0.06, 0, 0.1], [0.06, 6.6, -4.62, 3.3], [0.06, 6.6, 4.62, 3.3]] as const) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), seam);
    bar.position.set(x, y, -8.37);
    st.add(bar);
  }
  CERTIFICATES.forEach((c, i) => {
    const p = imagePanel(certificateImage(c.id), 2.55, 1.8, site.color);
    p.position.set(((i % 3) - 1) * 2.85, 4.55 - Math.floor(i / 3) * 2.15, -8.3);
    dyn.add(p);
  });
  const board = textPanel([
    { text: 'ROOT-ME · 11 WRITE-UPS · godboy', size: 40, color: '#c4b0ff', weight: 700, spacing: 5 },
    ...ROOTME.map((r) => ({ text: `${r.title}  ·  ${r.category}`, size: 30, color: '#ffffff', weight: 500 })),
  ], 3.2, 3.6, { color: site.color });
  board.position.set(-6.2, 2.4, -3.2);
  board.rotation.y = 0.95;
  dyn.add(board);
  st.add(terminalProp(cyber, 3.4, 0.8, -0.6, site.color));
  return { static: st, dynamic: dyn, colliders: col, terminal: new THREE.Vector3(3.4, 0, 0.8) };
}

function buildComms(mega: Kit, cyber: Kit, site: Site): DistrictBuild {
  const st = new THREE.Group(), dyn = new THREE.Group(), col = new THREE.Group();
  for (const k of [0, 1]) st.add(castShadows(place(mega, 'Column_Large_Straight', { x: 0, y: k * 10, z: -6.5, scale: [1.3, 1, 1.3] })));
  st.add(place(cyber, 'Antenna_2', { x: 0, y: 20.4, z: -6.5, scale: 4 }));
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6, 3));
  b.position.set(0, 3, -6.4);
  col.add(b);
  const rings: THREE.Mesh[] = [];
  [6, 11, 16].forEach((y, i) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(2.6 - i * 0.4, 2.72 - i * 0.4, 96), ringMaterial(i === 1 ? PALETTE.violet : site.color, 2.4, 40, 0.1 + i * 0.05));
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, y, -6.5);
    rings.push(r);
    dyn.add(r);
  });
  const contact = textPanel([
    { text: 'OPEN CHANNELS', size: 46, color: '#6ff3ff', weight: 700, spacing: 8 },
    ...(PROFILE.links.email ? [{ text: PROFILE.links.email, size: 40, color: '#ffffff', weight: 600 }] : []),
    { text: 'github.com/geraldkabre', size: 40, color: '#ffffff', weight: 600 },
    { text: 'Root-Me · godboy', size: 40, color: '#ffffff', weight: 600 },
  ], 3.4, 1.7, { color: site.color });
  contact.position.set(-3.8, 2.3, -4.2);
  contact.rotation.y = 0.55;
  dyn.add(contact);
  st.add(terminalProp(cyber, 3.4, 0.8, -0.6, site.color));
  return {
    static: st, dynamic: dyn, colliders: col, terminal: new THREE.Vector3(3.4, 0, 0.8),
    update: (t) => rings.forEach((r, i) => { r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); }),
  };
}

const BUILDERS: Record<Site['id'], (m: Kit, c: Kit, s: Site) => DistrictBuild> = {
  academy: buildAcademy, soc: buildSoc, missions: buildMissions, research: buildResearch, vault: buildVault, comms: buildComms,
};

export interface DistrictRuntime {
  id: Site['id'];
  center: THREE.Vector3;
  root: THREE.Group;
  arrival: Arrival;
  update: (t: number) => void;
}

/**
 * The campus around Nexus Prime: one portal per district on the plaza ring, six district islands (each presenting one
 * part of the portfolio through holograms, documents and a terminal), and the portals back to Nexus Prime.
 */
export function createCampus(mega: Kit, cyber: Kit, lib: MaterialLibrary) {
  const root = new THREE.Group();
  root.name = 'campus';
  const nexusPortals = new THREE.Group();
  nexusPortals.name = 'nexus-portals';
  const colliders = new THREE.Group();
  const portals: Portal[] = [];
  const terminals: Terminal[] = [];
  const districts: DistrictRuntime[] = [];
  const nexusArrivals = new Map<string, Arrival>();

  for (const site of SITES) {
    const info = DISTRICTS.find((d) => d.id === site.id)!;
    // ---- Portal on Nexus Prime (front faces the plaza centre).
    const p = siteXZ(site.az, PORTAL_RING);
    const dir = new THREE.Vector3(p.x, 0, p.z).normalize();
    const gate = buildPortal(mega, info.name.toUpperCase(), info.role.toUpperCase(), site.color);
    gate.group.position.set(p.x, 0, p.z);
    gate.group.rotation.y = yawOf(-dir.x, -dir.z);
    nexusPortals.add(gate.group);
    gate.colliders.position.copy(gate.group.position);
    gate.colliders.rotation.copy(gate.group.rotation);
    colliders.add(gate.colliders);
    gate.group.updateMatrixWorld(true);
    portals.push({ id: `nexus:${site.id}`, inverse: gate.group.matrixWorld.clone().invert(), to: site.id, uniforms: gate.uniforms });
    nexusArrivals.set(site.id, { position: new THREE.Vector3(p.x, 0, p.z).addScaledVector(dir, -5.6), yaw: yawOf(-dir.x, -dir.z) });

    // ---- District island.
    const c = siteXZ(site.az, site.dist);
    const center = new THREE.Vector3(c.x, site.y, c.z);
    const toNexus = new THREE.Vector3(-c.x, 0, -c.z).normalize();
    const island = createIsland(lib, { center, scale: DISTRICT_SCALE, plinth: false, lanes: [0, 90, 180, 270] });
    const district = new THREE.Group();
    district.name = `district-${site.id}`;
    const local = new THREE.Group(); // landmark frame: +Z toward Nexus Prime
    local.position.copy(center);
    local.rotation.y = yawOf(toNexus.x, toNexus.z);
    const build = BUILDERS[site.id](mega, cyber, site);
    const back = buildPortal(mega, 'NEXUS PRIME', 'RETURN LINK · COMMAND CENTER', site.color);
    back.group.position.set(0, 0, 10.4);
    back.group.rotation.y = Math.PI; // front faces the island centre
    build.dynamic.add(back.group);
    back.colliders.position.copy(back.group.position);
    back.colliders.rotation.copy(back.group.rotation);
    build.colliders.add(back.colliders);
    local.add(build.static, build.dynamic, build.colliders);
    local.updateMatrixWorld(true);
    back.group.updateMatrixWorld(true);
    portals.push({ id: `${site.id}:nexus`, inverse: back.group.matrixWorld.clone().invert(), to: 'command', uniforms: back.uniforms });
    const terminalWorld = build.terminal.clone().applyMatrix4(local.matrixWorld);
    terminals.push({ id: site.id, panel: info.panel, position: terminalWorld, radius: 2.6, prompt: `Open: ${info.role}` });
    const arrivalPos = new THREE.Vector3(0, 0, 5.4).applyMatrix4(local.matrixWorld);
    // Static parts -> one batch per material; colliders -> world space.
    const batched = batchStatic(build.static, `district-${site.id}-static`);
    local.remove(build.static);
    local.remove(build.colliders);
    build.colliders.position.copy(local.position);
    build.colliders.rotation.copy(local.rotation);
    colliders.add(island.colliders, build.colliders);
    district.add(island.group, batched, local);
    root.add(district);
    districts.push({
      id: site.id, center, root: district,
      arrival: { position: arrivalPos, yaw: yawOf(-toNexus.x, -toNexus.z) },
      update: (t) => { island.update(t); build.update?.(t); },
    });
  }
  // Nexus portal frames are static: batch them (the energy surfaces and signs stay dynamic).
  root.add(nexusPortals);

  return {
    root,
    colliders,
    portals,
    terminals,
    districts,
    nexusArrivals,
    /** Shows the detailed island the operator is on (the others are distant silhouettes). */
    setActive(id: string) {
      for (const d of districts) d.root.visible = d.id === id;
    },
    update(t: number, activeId: string) {
      districts.find((d) => d.id === activeId)?.update(t);
    },
  };
}
