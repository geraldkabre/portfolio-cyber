// CYBERVERSE environment kit builder.
//
// Reads the original Quaternius packs in assets-source/ (read-only, never modified) and writes:
//   public/assets/environments/megakit/megakit.glb       geometry-only kit, one root node per piece,
//                                                         original material NAMES kept (textures are assigned
//                                                         at runtime by src/world/materials.ts)
//   public/assets/environments/megakit/textures/{2k,1k}/  graded WebP texture sets
//   public/assets/environments/cyberkit/cyberkit.glb      Cyberpunk Game Kit props (flat colours, restyled at runtime)
//   public/assets/environments/*/manifest.json            per-piece bounds, triangle counts, material names
//
// Usage: node tools/env-build/build-kit.mjs [--skip-textures] [--all]
//   default: only the pieces listed in tools/env-build/pieces.json (production); --all: every piece (exploration)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO, Primitive, PropertyType, VertexLayout } from '@gltf-transform/core';
import { mergeDocuments, prune, dedup, weld, getBounds } from '@gltf-transform/functions';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..');
const SRC = path.join(REPO, 'assets-source');
const MEGA = path.join(SRC, '02-modular-sci-fi-megakit', 'Modular SciFi MegaKit[Standard]', 'Modular SciFi MegaKit[Standard]');
const CYBER = path.join(SRC, '01-cyberpunk-game-kit', 'Cyberpunk Game Kit - Quaternius-20261121T111705Z-1-001', 'Cyberpunk Game Kit - Quaternius');
const OUT = path.join(REPO, 'public', 'assets', 'environments');
const skipTextures = process.argv.includes('--skip-textures');
const allPieces = process.argv.includes('--all');
const PIECES = JSON.parse(fs.readFileSync(path.join(here, 'pieces.json'), 'utf8'));
const keep = (kit) => (p) => allPieces || PIECES[kit].includes(p.name);

// Separate (non-interleaved) attributes: the runtime merges static pieces into a few draw calls.
const io = new NodeIO().setVertexLayout(VertexLayout.SEPARATE);

/** Reads a .gltf as JSON + resources, strips every texture reference (materials keep name + factors). */
function readStripped(file) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dir = path.dirname(file);
  const resources = {};
  (json.buffers || []).forEach((b, i) => {
    if (!b.uri) return;
    if (b.uri.startsWith('data:')) {
      const uri = `buffer_${i}.bin`;
      resources[uri] = new Uint8Array(Buffer.from(b.uri.slice(b.uri.indexOf(',') + 1), 'base64'));
      b.uri = uri;
      return;
    }
    let p = path.join(dir, decodeURIComponent(b.uri));
    if (!fs.existsSync(p)) {
      // Known MegaKit defect: Decal_Line_90.gltf references Decal_Line_90_001.bin, the file is Decal_Line_90.bin.
      const alt = path.join(dir, path.basename(file, '.gltf') + '.bin');
      if (!fs.existsSync(alt)) throw new Error(`missing buffer ${b.uri} for ${file}`);
      console.warn(`  fix: ${path.basename(file)} buffer ${b.uri} -> ${path.basename(alt)} (in memory only)`);
      p = alt;
    }
    resources[b.uri] = new Uint8Array(fs.readFileSync(p));
  });
  delete json.images; delete json.textures; delete json.samplers;
  for (const m of json.materials || []) {
    const pbr = m.pbrMetallicRoughness;
    if (pbr) { delete pbr.baseColorTexture; delete pbr.metallicRoughnessTexture; }
    delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; delete m.extensions;
  }
  const keepExt = (e) => !/^KHR_materials_|^KHR_texture_transform/.test(e);
  if (json.extensionsUsed) json.extensionsUsed = json.extensionsUsed.filter(keepExt);
  if (json.extensionsRequired) json.extensionsRequired = json.extensionsRequired.filter(keepExt);
  return { json, resources };
}

function triCount(node) {
  let n = 0;
  node.traverse((c) => {
    const mesh = c.getMesh();
    if (!mesh) return;
    for (const p of mesh.listPrimitives()) {
      const idx = p.getIndices();
      n += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
    }
  });
  return n;
}

function materialsOf(node) {
  const s = new Set();
  node.traverse((c) => c.getMesh()?.listPrimitives().forEach((p) => p.getMaterial() && s.add(p.getMaterial().getName())));
  return [...s];
}

async function buildKit(name, pieces, { prefixAnimations = false } = {}) {
  const target = new Document();
  target.createBuffer('kit');
  const kitScene = target.createScene(name);
  for (const piece of pieces) {
    const { json, resources } = readStripped(piece.file);
    const src = await io.readJSON({ json, resources });
    const srcScene = src.getRoot().getDefaultScene() || src.getRoot().listScenes()[0];
    if (prefixAnimations) for (const a of src.getRoot().listAnimations()) a.setName(`${piece.name}|${a.getName()}`);
    const map = mergeDocuments(target, src);
    const tScene = map.get(srcScene);
    const holder = target.createNode(piece.name);
    for (const child of tScene.listChildren()) { tScene.removeChild(child); holder.addChild(child); }
    kitScene.addChild(holder);
    tScene.dispose();
  }
  const root = target.getRoot();
  // One buffer (GLB requirement).
  const [buf, ...others] = root.listBuffers();
  for (const acc of root.listAccessors()) acc.setBuffer(buf);
  for (const b of others) b.dispose();
  // Materials: merge by NAME only (runtime assigns art-directed materials by name).
  const byName = new Map();
  for (const m of root.listMaterials()) {
    const keep = byName.get(m.getName());
    if (!keep) { byName.set(m.getName(), m); continue; }
    for (const parent of m.listParents()) if (parent instanceof Primitive) parent.setMaterial(keep);
    m.dispose();
  }
  for (const s of root.listScenes()) if (s !== kitScene) s.dispose();
  root.setDefaultScene(kitScene);
  await target.transform(weld(), dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }), prune());

  const manifest = {};
  for (const holder of kitScene.listChildren()) {
    const b = getBounds(holder);
    manifest[holder.getName()] = {
      min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)),
      size: b.max.map((v, i) => +(v - b.min[i]).toFixed(3)), tris: triCount(holder), materials: materialsOf(holder),
    };
  }
  const outDir = path.join(OUT, name);
  fs.mkdirSync(outDir, { recursive: true });
  const glb = await io.writeBinary(target);
  fs.writeFileSync(path.join(outDir, `${name}.glb`), glb);
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const tris = Object.values(manifest).reduce((s, m) => s + m.tris, 0);
  console.log(`${name}: ${pieces.length} pieces, ${tris} triangles, ${(glb.byteLength / 1024).toFixed(0)} KB, ` +
    `${root.listMaterials().length} materials, ${root.listAnimations().length} animations`);
}

function listGltf(dir, filter = () => true) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.gltf') && filter(f))
    .map((f) => ({ name: path.basename(f, '.gltf'), file: path.join(dir, f) }));
}

// ---------------------------------------------------------------- textures
const T = path.join(MEGA, 'Textures');
const TEX = {
  trim01_base: 'T_Trim_01_BaseColor.png', trim01_normal: 'T_Trim_01_Normal.png', trim01_orm: 'T_Trim_01_ORM.png',
  trim02_base: 'T_Trim_02_BaseColor.png', trim02_normal: 'T_Trim_02_Normal.png', trim02_orm: 'T_Trim_02_ORM.png',
  trim03_base: 'T_Trim_03_BaseColor.png', trim03_normal: 'T_Trim_03_Normal.png', trim03_orm: 'T_Trim_03_ORM.png',
  trim03_cables: 'T_Trim_03_Cables.png',
  padded_base: 'T_PaddedWall_BaseColor.png', padded_normal: 'T_PaddedWall_Normal.png', padded_orm: 'T_PaddedWall_ORM.png',
  decals: 'T_Decals.png',
};
// Masks: R = light emitters (max of the channel-packed emissive), G = accent paint (detail mask).
const MASKS = {
  trim01_mask: { r: 'T_Trim_01_Emissive.png', g: 'T_Trim_01_DetailMask.png' },
  trim02_mask: { r: null, g: 'T_Trim_02_DetailMask.png' },
  padded_mask: { r: 'T_PaddingWall_Emissive.png', g: null },
};

async function channel(file, size, mode) {
  const { data, info } = await sharp(path.join(T, file)).resize(size, size, { kernel: 'lanczos3' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size);
  for (let i = 0, j = 0; i < out.length; i++, j += info.channels) {
    out[i] = mode === 'max' ? Math.max(data[j], data[j + 1], data[j + 2]) : data[j];
  }
  return out;
}

async function buildTextures() {
  const dir = path.join(OUT, 'megakit', 'textures');
  for (const size of [2048, 1024]) {
    const sub = path.join(dir, size === 2048 ? '2k' : '1k');
    fs.mkdirSync(sub, { recursive: true });
    let total = 0;
    for (const [key, file] of Object.entries(TEX)) {
      // Data maps that stay at 1K in every tier (see MaterialLibrary): not emitted in the 2K set.
      if (size === 2048 && /_orm$|^padded_normal$|^decals$|^trim03_cables$/.test(key)) continue;
      const out = path.join(sub, `${key}.webp`);
      let img = sharp(path.join(T, file)).resize(size, size, { kernel: 'lanczos3' });
      if (/normal|orm/.test(key)) img = img.removeAlpha().webp({ nearLossless: true, quality: 70, effort: 5 }); // no chroma subsampling for data maps
      else if (key === 'decals') img = img.webp({ quality: 90, alphaQuality: 100, effort: 5 });
      else img = img.removeAlpha().webp({ quality: 86, smartSubsample: true, effort: 5 });
      await img.toFile(out);
      total += fs.statSync(out).size;
    }
    for (const [key, m] of Object.entries(MASKS)) {
      if (size === 2048 && key === 'padded_mask') continue;
      const n = size * size;
      const r = m.r ? await channel(m.r, size, 'max') : Buffer.alloc(n);
      const g = m.g ? await channel(m.g, size, 'first') : Buffer.alloc(n);
      const rgb = Buffer.alloc(n * 3);
      for (let i = 0; i < n; i++) { rgb[i * 3] = r[i]; rgb[i * 3 + 1] = g[i]; }
      const out = path.join(sub, `${key}.webp`);
      await sharp(rgb, { raw: { width: size, height: size, channels: 3 } }).webp({ lossless: true, effort: 6 }).toFile(out);
      total += fs.statSync(out).size;
    }
    console.log(`textures ${size}: ${(total / 1024 / 1024).toFixed(2)} MB`);
  }
}

// ---------------------------------------------------------------- run
const megaPieces = ['Columns', 'Platforms', 'Props', 'Walls', 'Decals']
  .flatMap((cat) => listGltf(path.join(MEGA, 'glTF', cat))).filter(keep('megakit'));
await buildKit('megakit', megaPieces);

const cyberPieces = [
  ...listGltf(path.join(CYBER, 'Platforms')),
  ...listGltf(path.join(CYBER, 'Pickups and Objects'), (f) => /^(Collectible_Board|Lever|Lootbox|Tank)\.gltf$/.test(f)),
  ...listGltf(path.join(CYBER, 'Enemies'), (f) => /^(Enemy_Flying|Turret_Teleporter)\.gltf$/.test(f)),
];
await buildKit('cyberkit', cyberPieces.filter(keep('cyberkit')), { prefixAnimations: true });

if (!skipTextures) await buildTextures();
