// CYBERVERSE edition of "NEON FIGHTER +" (VRoid Hub, Kanato — modification and redistribution allowed by its licence).
// Identity kept (halftone cyan hoodie, PEACE / heartbeat print, cat ears, halo, water drop, hair gradient).
// Changes: pure blacks -> deep navy, grey tights/sleeves -> navy, orange trim -> violet, controlled emission on the
// cyan / white details, shared MToon look with Cyber JT, invisible part of the drop hair card removed (true bounds).
import { bakeMaterial, applyToon, finalize } from './common.js';

const GRADE = /* glsl */`
vec3 navyDark(vec3 b, vec3 target) {                 // near-black -> deep navy, keeps the halftone structure
  vec3 hsv = rgb2hsv(b);
  float dark = 1.0 - smoothstep(0.05, 0.24, hsv.z);
  return mix(b, target + b * 0.6, dark);
}
float hueIn(float h, float a, float b) { return smoothstep(a - 0.02, a + 0.02, h) * (1.0 - smoothstep(b - 0.02, b + 0.02, h)); }
`;

const TOP = GRADE + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  vec3 b = base.rgb; vec3 hsv = rgb2hsv(b);
  col = navyDark(b, NAVY_950);
  float white = smoothstep(0.78, 0.95, hsv.z) * (1.0 - smoothstep(0.12, 0.30, hsv.y));
  float cyan = smoothstep(0.60, 0.95, hsv.z) * smoothstep(0.45, 0.80, hsv.y) * hueIn(hsv.x, 0.44, 0.62);
  emi = CYAN * white * 0.30 + b * cyan * 0.16;
}`;

const SHORTS = GRADE + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  vec3 b = base.rgb; vec3 hsv = rgb2hsv(b);
  vec3 c = navyDark(b, NAVY_950);
  float orange = hueIn(hsv.x, 0.02, 0.17) * smoothstep(0.30, 0.50, hsv.y) * smoothstep(0.30, 0.50, hsv.z);
  float cyan = smoothstep(0.45, 0.80, hsv.z) * smoothstep(0.40, 0.70, hsv.y) * hueIn(hsv.x, 0.44, 0.62);
  col = mix(c, VIOLET, orange);
  emi = VIOLET * orange * 0.9 + b * cyan * 0.22;
}`;

// skin texture also carries the tights and arm sleeves: only neutral (grey / black) texels are recoloured
const BODY = GRADE + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  vec3 b = base.rgb; vec3 hsv = rgb2hsv(b);
  float neutral = 1.0 - smoothstep(0.10, 0.20, hsv.y);
  float cloth = neutral * (1.0 - smoothstep(0.60, 0.70, hsv.z));
  vec3 navyC = mix(NAVY_950, vec3(0.15, 0.21, 0.36), smoothstep(0.06, 0.45, hsv.z));
  col = mix(b, navyC, cloth);
  float trim = smoothstep(0.35, 0.50, hsv.y) * hueIn(hsv.x, 0.45, 0.66) * smoothstep(0.20, 0.40, hsv.z);
  emi = CYAN * trim * 0.55;
}`;

const NAVY_ONLY = GRADE + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  vec3 b = base.rgb; vec3 hsv = rgb2hsv(b);
  float neutral = 1.0 - smoothstep(0.10, 0.20, hsv.y);
  vec3 navyC = mix(NAVY_950, vec3(0.13, 0.18, 0.32), smoothstep(0.05, 0.40, hsv.z));
  col = mix(b, navyC, neutral * (1.0 - smoothstep(0.55, 0.70, hsv.z)));
  float cyan = smoothstep(0.45, 0.85, hsv.z) * smoothstep(0.40, 0.70, hsv.y) * hueIn(hsv.x, 0.44, 0.66);
  emi = b * cyan * 0.25;
}`;

const HAIR = GRADE + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  vec3 b = base.rgb; vec3 hsv = rgb2hsv(b);
  col = navyDark(b, NAVY_900);
  float cyan = smoothstep(0.70, 0.98, hsv.z) * smoothstep(0.40, 0.80, hsv.y) * hueIn(hsv.x, 0.44, 0.62);
  emi = b * cyan * 0.10;
}`;
const GLOW = (k) => /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  col = base.rgb; emi = base.rgb * ${k.toFixed(2)};
}`;

/** Remove the triangles of a primitive whose UV footprint is fully transparent in its main texture (lossless visually). */
async function trimInvisible(ctx, needle) {
  const { doc, B, G, V } = ctx;
  const mi = V.findMaterial(doc, needle);
  const [[meshI, primI]] = V.primsOfMaterial(doc, mi);
  const prim = doc.json.meshes[meshI].primitives[primI];
  const im = doc.json.images[V.mainImage(doc, mi)];
  const img = await B.decodeImage(doc.views[im.bufferView], im.mimeType);
  const uv = G.readAccessor(doc, prim.attributes.TEXCOORD_0), pos = G.readAccessor(doc, prim.attributes.POSITION);
  const idx = G.readAccessor(doc, prim.indices);
  const W = img.width, H = img.height, A = (x, y) => img.data[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4 + 3];
  const keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const p = [0, 1, 2].map((k) => [uv[idx[t + k] * 2] * W, uv[idx[t + k] * 2 + 1] * H]);
    const x0 = Math.floor(Math.min(...p.map((q) => q[0]))) - 1, x1 = Math.ceil(Math.max(...p.map((q) => q[0]))) + 1;
    const y0 = Math.floor(Math.min(...p.map((q) => q[1]))) - 1, y1 = Math.ceil(Math.max(...p.map((q) => q[1]))) + 1;
    const [a, b, c] = p; const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    let visible = false;
    for (let y = y0; y <= y1 && !visible; y++) for (let x = x0; x <= x1 && !visible; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den;
      const l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den;
      const tol = 2.5 / Math.max(1, Math.abs(den) ** 0.5);          // include texels touching the edges (bilinear footprint)
      if (l1 >= -tol && l2 >= -tol && 1 - l1 - l2 >= -tol && A(x, y) > 8) visible = true;
    }
    if (visible) keep.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  const T = idx.constructor; G.writeAccessor(doc, prim.indices, new T(keep));
  const compacted = G.compactMesh(doc, meshI);                     // drop the now-unreferenced vertices (true bounding box)
  let maxY = -1e9; for (const v of keep) maxY = Math.max(maxY, pos[v * 3 + 1]);
  ctx.out.trim = { material: needle, trianglesBefore: idx.length / 3, trianglesAfter: keep.length / 3, newMaxY: +maxY.toFixed(3), vertices: compacted };
  ctx.log(`trimmed ${needle}: ${idx.length / 3} -> ${keep.length / 3} triangles, top now ${maxY.toFixed(3)} m`);
}

/** Calmer hair springs: with the original values (stiffness 0.4-0.8, drag 0.4, gravity 0-0.1) the long hair whips over the face
 *  during the Jog clip (its hips bounce 24 cm at ~2 Hz). */
function tuneHairSprings(ctx) {
  const groups = ctx.V.vrmExt(ctx.doc).secondaryAnimation.boneGroups;
  const changed = [];
  groups.forEach((g, i) => {
    if (g.comment !== 'Hair') return;
    const before = { stiffiness: g.stiffiness, dragForce: g.dragForce, gravityPower: g.gravityPower };
    g.stiffiness = Math.max(g.stiffiness, 0.9); g.dragForce = Math.max(g.dragForce, 0.7); g.gravityPower = Math.max(g.gravityPower, 0.25);
    // arm / hand colliders sweep through the long hair hanging behind the shoulders and fling it: keep torso/neck/head only
    const cg = ctx.V.vrmExt(ctx.doc).secondaryAnimation.colliderGroups;
    const nodes = ctx.doc.json.nodes;
    g.colliderGroups = g.colliderGroups.filter((k) => !/(UpperArm|LowerArm|Hand)$/.test(nodes[cg[k].node].name));
    changed.push({ group: i, before, after: { stiffiness: g.stiffiness, dragForce: g.dragForce, gravityPower: g.gravityPower, colliderGroups: g.colliderGroups } });
  });
  ctx.out.springs = changed; ctx.log(`spring groups tuned: ${changed.length}`);
}

export async function run(ctx) {
  const { doc, V } = ctx;
  // tuneHairSprings(ctx) is NOT applied: the hair whipping seen while jogging came from the retargeted hips bounce
  // (fixed by per-frame foot grounding in src/cyberverse/characters/humanoidClips.js), not from the spring settings.
  await trimInvisible(ctx, 'Hair_00_HAIR_03');
  await bakeMaterial(ctx, { needle: 'Tops_01_CLOTH', design: TOP, toon: 'cloth', blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Bottoms_01_CLOTH', design: SHORTS, toon: 'cloth', blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Body_00_SKIN', design: BODY, size: [1024, 1024], blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Onepiece_00_CLOTH', design: NAVY_ONLY, toon: 'cloth', size: [1024, 1024], blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Shoes_01_CLOTH', design: NAVY_ONLY, toon: 'cloth', blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Accessory_CatEar', design: NAVY_ONLY, toon: 'cloth', blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Hair_00_HAIR_01', design: HAIR, toon: 'hair', blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Hair_00_HAIR_02', design: GLOW(0.45), toon: 'hair', blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'Hair_00_HAIR_03', design: GLOW(0.40), toon: 'hair', blurLod: 1 });
  await bakeMaterial(ctx, { needle: 'HairBack_00_HAIR', design: HAIR, toon: 'hair', blurLod: 1 });
  await finalize(ctx, {
    outRel: new URLSearchParams(location.search).get('out') || 'characters/neon-fighter/neon-fighter.cv.vrm',
    meta: { title: 'NEON FIGHTER + — CYBERVERSE edition', version: 'cv-1.0', author: 'Kanato (original); CYBERVERSE edit',
      reference: 'https://hub.vroid.com/characters/1731822748557317042/models/1819146148563416740' },
  });
  void V;
}
