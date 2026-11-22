import * as THREE from 'three';

/**
 * Annular band between two circles (r0, y0) -> (r1, y1): floors, chamfers, vertical rims, hull tiers.
 * UVs: u = arc length / tile, v = profile length / tile (+ vOffset), so kit textures keep a constant texel density.
 * When `worldUV` is set, uv = world XZ / tile instead (flat floors).
 */
export function band(r0: number, y0: number, r1: number, y1: number, opts: {
  segments?: number; tile?: number; flip?: boolean; worldUV?: boolean; vOffset?: number; arc?: [number, number];
  /** Maps the whole profile onto [v0, v1] of a trim sheet (u still follows arc length / tile). */
  vRange?: [number, number];
} = {}) {
  const seg = opts.segments ?? 128;
  const tile = opts.tile ?? 4;
  const [a0, a1] = opts.arc ?? [0, Math.PI * 2];
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  const dr = r1 - r0, dy = y1 - y0;
  const len = Math.hypot(dr, dy) || 1;
  // Profile normal (in the radial/vertical plane), pointing "up/outward" for an outward-going band.
  let nr = dy / len, ny = -dr / len;
  if (ny < 0 || (Math.abs(ny) < 1e-6 && nr < 0)) { nr = -nr; ny = -ny; }
  if (opts.flip) { nr = -nr; ny = -ny; }
  const rMid = (r0 + r1) / 2;
  for (let i = 0; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg;
    const c = Math.cos(a), s = Math.sin(a);
    for (const [r, y, v] of [[r0, y0, 0], [r1, y1, len]] as const) {
      pos.push(r * c, y, r * s);
      nrm.push(nr * c, ny, nr * s);
      if (opts.worldUV) uv.push((r * c) / tile, (r * s) / tile);
      else if (opts.vRange) uv.push((a * rMid) / tile, opts.vRange[0] + (v / len) * (opts.vRange[1] - opts.vRange[0]));
      else uv.push((a * rMid) / tile, (v + (opts.vOffset ?? 0)) / tile);
    }
  }
  // Triangle (a, c, b) has the geometric normal (-dy, dr) in the radial plane: pick the winding facing (nr, ny).
  const ccw = -dy * nr + dr * ny > 0;
  for (let i = 0; i < seg; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (ccw) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Flat disc (cap) at height y with world-space UVs. */
export function disc(r: number, y: number, opts: { segments?: number; tile?: number; down?: boolean } = {}) {
  const seg = opts.segments ?? 128;
  const tile = opts.tile ?? 4;
  const pos = [0, y, 0], nrm = [0, opts.down ? -1 : 1, 0], uv = [0, 0], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    pos.push(x, y, z);
    nrm.push(0, opts.down ? -1 : 1, 0);
    uv.push(x / tile, z / tile);
  }
  for (let i = 1; i <= seg; i++) {
    if (opts.down) idx.push(0, i, i + 1); else idx.push(0, i + 1, i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Regular polygon prism slab (roofs), flat-shaded sides, with uv in metres / tile. */
export function polySlab(sides: number, radius: number, y0: number, y1: number, rotation = 0, tile = 4) {
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, y1, 0);
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const vertical = Math.abs(n.getY(i)) < 0.5;
    if (vertical) uv.setXY(i, (p.getX(i) * -n.getZ(i) + p.getZ(i) * n.getX(i)) / tile, p.getY(i) / tile);
    else uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
  }
  return g;
}

/** Merges geometries that share the same attribute layout (position, normal, uv). */
export function normalizeForMerge(g: THREE.BufferGeometry) {
  const out = g;
  for (const [name, attr] of Object.entries(out.attributes)) out.setAttribute(name, plainAttribute(attr));
  for (const name of Object.keys(out.attributes)) if (!['position', 'normal', 'uv'].includes(name)) out.deleteAttribute(name);
  if (!out.getAttribute('uv')) out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(out.getAttribute('position').count * 2), 2));
  if (!out.getAttribute('normal')) out.computeVertexNormals();
  if (!out.index) {
    const n = out.getAttribute('position').count;
    out.setIndex([...Array(n).keys()]);
  }
  out.morphAttributes = {};
  return out;
}

/** Converts interleaved / normalized attributes into plain Float32 attributes (mergeable, transformable). */
export function plainAttribute(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): THREE.BufferAttribute {
  if (!(attr as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute && attr.array instanceof Float32Array && !attr.normalized) return attr as THREE.BufferAttribute;
  const n = attr.count, size = attr.itemSize;
  const out = new Float32Array(n * size);
  for (let i = 0; i < n; i++) {
    out[i * size] = attr.getX(i);
    if (size > 1) out[i * size + 1] = attr.getY(i);
    if (size > 2) out[i * size + 2] = attr.getZ(i);
    if (size > 3) out[i * size + 3] = attr.getW(i);
  }
  return new THREE.BufferAttribute(out, size, false);
}
