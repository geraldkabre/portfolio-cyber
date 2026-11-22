// Shared steps for production character builds.

/** Cool, coherent MToon look shared by both CYBERVERSE characters (values in MToon/UniVRM 0.x sRGB convention). */
export const TOON = {
  cloth: { _ShadeColor: [0.55, 0.62, 0.86, 1], _RimColor: [0.0, 0.20, 0.30, 1], _OutlineColor: [0.02, 0.04, 0.10, 1] },
  hair: { _RimColor: [0.03, 0.14, 0.26, 1], _OutlineColor: [0.02, 0.04, 0.10, 1] },
  rimFloats: { _RimFresnelPower: 5.0, _RimLift: 0.0, _RimLightingMix: 0.6 },
};

export function applyToon(ctx, matIndex, kind = 'cloth') {
  const { V, doc } = ctx;
  V.setMToon(doc, matIndex, { vector: { ...TOON[kind] }, float: { ...TOON.rimFloats } });
}

function imageUsers(doc, V, imageIndex) {
  const users = [];
  V.vrmExt(doc).materialProperties.forEach((m, mi) => {
    for (const [k, t] of Object.entries(m.textureProperties)) if (V.texImage(doc, t) === imageIndex) users.push([mi, k]);
  });
  return users;
}

/**
 * Redesign one material: bake `design` GLSL into its main texture (in place when not shared) and into a new
 * emission texture. opts: { needle, design, size:[w,h], blurLod, quality, alphaFn, emissionColor, toon }
 */
export async function bakeMaterial(ctx, opts) {
  const { doc, B, V, renderer, out, images, log } = ctx;
  const mi = V.findMaterial(doc, opts.needle);
  const prims = V.primsOfMaterial(doc, mi);
  const geos = prims.map(([m, p]) => B.primitiveGeometry(doc, m, p));
  const m = V.mtoon(doc, mi);
  const imgIndex = V.texImage(doc, m.textureProperties._MainTex);
  const im = doc.json.images[imgIndex];
  const img = await B.decodeImage(doc.views[im.bufferView], im.mimeType);
  const [W, H] = opts.size || [img.width, img.height];
  const t0 = performance.now();
  const res = B.dilate(B.bakeUV(renderer, { geometries: geos, width: W, height: H, baseBitmap: img.bitmap, design: opts.design, blurLod: opts.blurLod ?? 5 }), 10);
  const { rgba, emis } = B.composite(res, img, opts.alphaFn);
  const alpha = (() => { for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 255) return true; return false; })();
  const bytes = await B.encode(rgba, W, H, 'image/webp', opts.quality ?? 0.9);
  // main texture: replace in place if only this material uses it (as _MainTex/_ShadeTexture), else add a new one
  const users = imageUsers(doc, V, imgIndex).filter(([u]) => u !== mi);
  let mainTex = m.textureProperties._MainTex;
  if (users.length) { mainTex = ctx.G.addTexture(doc, bytes, 'image/webp', im.name + '_cv'); }
  else ctx.G.setImage(doc, imgIndex, bytes, 'image/webp');
  ctx.done.add(V.texImage(doc, mainTex));
  const texture = { _MainTex: mainTex, _ShadeTexture: mainTex };
  // emission texture (skipped when the design produced no emission)
  let emissive = 0; for (let i = 0; i < emis.length; i += 4) if (emis[i] + emis[i + 1] + emis[i + 2] > 6) emissive++;
  if (emissive > 0) {
    // emission maps only carry thin glowing lines / masks: half resolution for 2K textures (GPU memory)
    const es = opts.emissionScale ?? (Math.max(W, H) >= 2048 ? 0.5 : 1);
    const EW = Math.round(W * es), EH = Math.round(H * es);
    const ebytes = es === 1 ? await B.encode(emis, W, H, 'image/webp', 0.9) : await B.encode(B.downscale(emis, W, H, EW, EH), EW, EH, 'image/webp', 0.92);
    texture._EmissionMap = ctx.G.addTexture(doc, ebytes, 'image/webp', im.name + '_emission_cv');
    ctx.done.add(V.texImage(doc, texture._EmissionMap));
  }
  V.setMToon(doc, mi, { texture, vector: { _EmissionColor: opts.emissionColor || [1, 1, 1, 1] } });
  if (opts.toon) applyToon(ctx, mi, opts.toon);
  const short = doc.json.materials[mi].name.replace(/ \(Instance\)/, '').replace(/^N00_\d+_\d+_/, '');
  images['tex_' + short] = B.previewURL(rgba, W, H, 1024);
  if (emissive) images['emi_' + short] = B.previewURL(emis, W, H, 512);
  out.textures = out.textures || [];
  out.textures.push({ material: short, size: [W, H], from: [img.width, img.height], bytes: bytes.length, alpha, emissiveTexels: emissive, ms: Math.round(performance.now() - t0) });
  log(`baked ${short} ${W}x${H} -> ${(bytes.length / 1024).toFixed(0)} KB, emissive texels ${emissive}`);
  return { mi, imgIndex };
}

/** Re-encode every image not produced by the recipe to WebP (optionally downscaled), sparsify morphs, update meta, write. */
export async function finalize(ctx, { outRel, maxSize = {}, meta = {} }) {
  const { doc, B, G, V, out, log } = ctx;
  const ext = V.vrmExt(doc);
  // which images are normal maps
  const normalImgs = new Set();
  for (const m of ext.materialProperties) if (m.textureProperties._BumpMap !== undefined) normalImgs.add(V.texImage(doc, m.textureProperties._BumpMap));
  const thumbImg = ext.meta.texture !== undefined && ext.meta.texture >= 0 ? V.texImage(doc, ext.meta.texture) : -1;
  out.reencoded = [];
  for (let i = 0; i < doc.json.images.length; i++) {
    if (ctx.done.has(i)) continue;
    const im = doc.json.images[i];
    const img = await B.decodeImage(doc.views[im.bufferView], im.mimeType);
    if (img.width <= 16) continue;                                   // 8x8 placeholder textures: leave as is
    let limit = maxSize[i] ?? (i === thumbImg ? 512 : 4096);
    const s = Math.min(1, limit / Math.max(img.width, img.height));
    const W = Math.round(img.width * s), H = Math.round(img.height * s);
    const before = doc.views[im.bufferView].byteLength;
    const bytes = await B.reencode(img, W, H, 'image/webp', normalImgs.has(i) ? 0.95 : 0.9);
    if (bytes.length < before) { G.setImage(doc, i, bytes, 'image/webp'); out.reencoded.push({ image: i, name: im.name, from: [img.width, img.height], to: [W, H], before, after: bytes.length }); }
  }
  // morph targets -> sparse accessors (lossless)
  const targets = new Set();
  for (const m of doc.json.meshes) for (const p of m.primitives) for (const t of p.targets || []) for (const a of Object.values(t)) targets.add(a);
  let mb = 0, ma = 0;
  for (const a of targets) { const r = G.sparsifyAccessor(doc, a, 0); mb += r.before; ma += r.after; }
  out.morphs = { accessors: targets.size, beforeBytes: mb, afterBytes: ma };
  Object.assign(ext.meta, meta);
  doc.json.asset.generator = (doc.json.asset.generator || '') + ' + CYBERVERSE char-studio';
  const removed = G.prune(doc);
  const bytes = G.writeGLB(doc);
  await ctx.save(outRel, bytes);
  out.output = { rel: outRel, bytes: bytes.length, prunedViews: removed };
  log(`wrote ${outRel} ${(bytes.length / 1048576).toFixed(2)} MB`);
}
