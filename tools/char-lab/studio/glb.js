// Minimal GLB / VRM 0.x reader-writer for build scripts (browser ES module, no dependencies).
// A document is { json, views: Uint8Array[] } : one byte array per bufferView, so views can be
// replaced or appended freely; writeGLB() re-packs everything into a single aligned BIN chunk.

const GLB_MAGIC = 0x46546c67, CHUNK_JSON = 0x4e4f534a, CHUNK_BIN = 0x004e4942;
const align4 = (n) => (n + 3) & ~3;

export function parseGLB(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  if (dv.getUint32(0, true) !== GLB_MAGIC) throw new Error('not a GLB file');
  let off = 12, json = null, bin = null;
  while (off < arrayBuffer.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, off + 8, len)));
    else if (type === CHUNK_BIN) bin = new Uint8Array(arrayBuffer, off + 8, len);
    off += 8 + len;
  }
  const views = json.bufferViews.map((bv) => bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
  return { json, views };
}

export function writeGLB(doc) {
  const { json, views } = doc;
  let total = 0; const offs = [];
  for (const v of views) { total = align4(total); offs.push(total); total += v.byteLength; }
  total = align4(total);
  const bin = new Uint8Array(total);
  views.forEach((v, i) => {
    bin.set(v, offs[i]);
    Object.assign(json.bufferViews[i], { buffer: 0, byteOffset: offs[i], byteLength: v.byteLength });
  });
  json.buffers = [{ byteLength: total }];
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = align4(jsonBytes.length);
  const out = new Uint8Array(12 + 8 + jsonLen + 8 + total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, GLB_MAGIC, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jsonLen, true); dv.setUint32(16, CHUNK_JSON, true);
  out.fill(0x20, 20, 20 + jsonLen); out.set(jsonBytes, 20);
  dv.setUint32(20 + jsonLen, total, true); dv.setUint32(24 + jsonLen, CHUNK_BIN, true);
  out.set(bin, 28 + jsonLen);
  return out;
}

export function addView(doc, bytes, extra = {}) {
  doc.json.bufferViews.push({ buffer: 0, byteOffset: 0, byteLength: bytes.byteLength, ...extra });
  doc.views.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return doc.json.bufferViews.length - 1;
}

const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/** Dense typed array for an accessor (handles missing bufferView and sparse). No byteStride support (VRoid exports are tightly packed). */
export function readAccessor(doc, index) {
  const a = doc.json.accessors[index]; const T = COMP[a.componentType]; const n = NCOMP[a.type];
  let arr;
  if (a.bufferView === undefined) arr = new T(a.count * n);
  else {
    const bv = doc.json.bufferViews[a.bufferView];
    if (bv.byteStride && bv.byteStride !== T.BYTES_PER_ELEMENT * n) throw new Error('byteStride not supported');
    const v = doc.views[a.bufferView];
    arr = new T(v.buffer.slice(v.byteOffset + (a.byteOffset || 0), v.byteOffset + (a.byteOffset || 0) + a.count * n * T.BYTES_PER_ELEMENT));
  }
  if (a.sparse) {
    const s = a.sparse, IT = COMP[s.indices.componentType];
    const iv = doc.views[s.indices.bufferView], vv = doc.views[s.values.bufferView];
    const idx = new IT(iv.buffer.slice(iv.byteOffset + (s.indices.byteOffset || 0), iv.byteOffset + (s.indices.byteOffset || 0) + s.count * IT.BYTES_PER_ELEMENT));
    const val = new T(vv.buffer.slice(vv.byteOffset + (s.values.byteOffset || 0), vv.byteOffset + (s.values.byteOffset || 0) + s.count * n * T.BYTES_PER_ELEMENT));
    for (let i = 0; i < s.count; i++) for (let k = 0; k < n; k++) arr[idx[i] * n + k] = val[i * n + k];
  }
  return arr;
}

/** Replace an accessor's data with a new dense array (new bufferView appended; old view left for prune()). */
export function writeAccessor(doc, index, typed) {
  const a = doc.json.accessors[index];
  a.bufferView = addView(doc, new Uint8Array(typed.buffer.slice(typed.byteOffset, typed.byteOffset + typed.byteLength)));
  a.byteOffset = 0; delete a.sparse;
  a.count = typed.length / NCOMP[a.type];
  if (a.min || a.max) {
    const n = NCOMP[a.type], mn = new Array(n).fill(Infinity), mx = new Array(n).fill(-Infinity);
    for (let i = 0; i < typed.length; i++) { const k = i % n; mn[k] = Math.min(mn[k], typed[i]); mx[k] = Math.max(mx[k], typed[i]); }
    a.min = mn; a.max = mx;
  }
}

/** Convert a float VEC3 morph-target accessor to a sparse accessor (lossless: entries with |d| <= eps are exact zeros). */
export function sparsifyAccessor(doc, index, eps = 0) {
  const a = doc.json.accessors[index];
  if (a.sparse || a.type !== 'VEC3' || a.componentType !== 5126) return { before: 0, after: 0 };
  const dense = readAccessor(doc, index); const n = a.count;
  const before = n * 12; const keep = [];
  for (let i = 0; i < n; i++) if (Math.abs(dense[i * 3]) > eps || Math.abs(dense[i * 3 + 1]) > eps || Math.abs(dense[i * 3 + 2]) > eps) keep.push(i);
  delete a.bufferView; delete a.byteOffset;
  if (!keep.length) { delete a.sparse; return { before, after: 0 }; }   // accessor with no bufferView = all zeros (glTF 2.0 §3.6.2)
  const idx = n < 65536 ? new Uint16Array(keep) : new Uint32Array(keep);
  const val = new Float32Array(keep.length * 3);
  keep.forEach((v, j) => { val[j * 3] = dense[v * 3]; val[j * 3 + 1] = dense[v * 3 + 1]; val[j * 3 + 2] = dense[v * 3 + 2]; });
  a.sparse = { count: keep.length,
    indices: { bufferView: addView(doc, new Uint8Array(idx.buffer)), componentType: n < 65536 ? 5123 : 5125 },
    values: { bufferView: addView(doc, new Uint8Array(val.buffer)) } };
  return { before, after: idx.byteLength + val.byteLength };
}

/** Replace the bytes of an image. mime: image/png | image/jpeg | image/webp (webp switches its textures to EXT_texture_webp). */
export function setImage(doc, imageIndex, bytes, mime) {
  const im = doc.json.images[imageIndex];
  im.bufferView = addView(doc, bytes); im.mimeType = mime; delete im.uri;
  if (mime === 'image/webp') {
    for (const t of doc.json.textures) {
      const src = t.extensions?.EXT_texture_webp?.source ?? t.source;
      if (src === imageIndex) { t.extensions = { ...(t.extensions || {}), EXT_texture_webp: { source: imageIndex } }; delete t.source; }
    }
    for (const k of ['extensionsUsed', 'extensionsRequired']) {
      doc.json[k] = doc.json[k] || []; if (!doc.json[k].includes('EXT_texture_webp')) doc.json[k].push('EXT_texture_webp');
    }
  }
}

/** Add a new image + texture (reusing sampler 0 if any); returns the texture index. */
export function addTexture(doc, bytes, mime, name) {
  doc.json.images.push({ name, bufferView: addView(doc, bytes), mimeType: mime });
  const img = doc.json.images.length - 1;
  const tex = mime === 'image/webp' ? { sampler: 0, extensions: { EXT_texture_webp: { source: img } } } : { sampler: 0, source: img };
  doc.json.textures.push(tex);
  if (mime === 'image/webp') for (const k of ['extensionsUsed', 'extensionsRequired']) {
    doc.json[k] = doc.json[k] || []; if (!doc.json[k].includes('EXT_texture_webp')) doc.json[k].push('EXT_texture_webp');
  }
  return doc.json.textures.length - 1;
}

export const imageBytes = (doc, i) => doc.views[doc.json.images[i].bufferView];

/** Remove vertices no primitive of the mesh references (primitives must share the same vertex accessors, as in VRoid exports). */
export function compactMesh(doc, meshIndex) {
  const mesh = doc.json.meshes[meshIndex]; const p0 = mesh.primitives[0];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!mesh.primitives.every((p) => same(p.attributes, p0.attributes) && same(p.targets || [], p0.targets || []))) throw new Error('primitives do not share vertices');
  const count = doc.json.accessors[p0.attributes.POSITION].count;
  const indices = mesh.primitives.map((p) => readAccessor(doc, p.indices));
  const used = new Uint8Array(count); for (const ix of indices) for (const v of ix) used[v] = 1;
  const remap = new Int32Array(count).fill(-1); let n = 0; for (let v = 0; v < count; v++) if (used[v]) remap[v] = n++;
  if (n === count) return { before: count, after: count };
  const compact = (acc) => {
    const a = doc.json.accessors[acc]; const k = NCOMP[a.type]; const src = readAccessor(doc, acc); const dst = new src.constructor(n * k);
    for (let v = 0; v < count; v++) if (remap[v] >= 0) for (let c = 0; c < k; c++) dst[remap[v] * k + c] = src[v * k + c];
    writeAccessor(doc, acc, dst);
  };
  for (const acc of Object.values(p0.attributes)) compact(acc);
  for (const t of p0.targets || []) for (const acc of Object.values(t)) compact(acc);
  mesh.primitives.forEach((p, i) => { const ix = indices[i]; const out = new ix.constructor(ix.length); for (let j = 0; j < ix.length; j++) out[j] = remap[ix[j]]; writeAccessor(doc, p.indices, out); });
  return { before: count, after: n };
}

/** Drop bufferViews that nothing references any more and renumber references. */
export function prune(doc) {
  const j = doc.json; const used = new Set();
  for (const a of j.accessors) { if (a.bufferView !== undefined) used.add(a.bufferView); if (a.sparse) { used.add(a.sparse.indices.bufferView); used.add(a.sparse.values.bufferView); } }
  for (const im of j.images || []) if (im.bufferView !== undefined) used.add(im.bufferView);
  const map = new Map(); const views = [], bvs = [];
  j.bufferViews.forEach((bv, i) => { if (used.has(i)) { map.set(i, views.length); views.push(doc.views[i]); bvs.push(bv); } });
  for (const a of j.accessors) { if (a.bufferView !== undefined) a.bufferView = map.get(a.bufferView); if (a.sparse) { a.sparse.indices.bufferView = map.get(a.sparse.indices.bufferView); a.sparse.values.bufferView = map.get(a.sparse.values.bufferView); } }
  for (const im of j.images || []) if (im.bufferView !== undefined) im.bufferView = map.get(im.bufferView);
  const removed = j.bufferViews.length - bvs.length;
  j.bufferViews = bvs; doc.views = views;
  return removed;
}
