// Diagnostic recipe: UV maps annotated with body position (10 cm grid) and normal direction, plus bounds per material.
const DEBUG = /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  vec3 nc = 0.5 + 0.5 * N;                       // normal as colour: +Z (front) = blue, +X = red, +Y = green
  float gy = band(fract(P.y * 10.0 + 0.5) - 0.5, 0.05);
  float gx = band(fract(P.x * 10.0 + 0.5) - 0.5, 0.05);
  float x0 = band(P.x, 0.004);
  col = mix(nc, base.rgb, 0.35);
  col = mix(col, vec3(1.0, 1.0, 0.0), gy);
  col = mix(col, vec3(1.0, 0.0, 1.0), gx * 0.8);
  col = mix(col, vec3(1.0), x0);
}`;

export async function run({ doc, B, V, renderer, images, out, log }) {
  out.materials = [];
  for (const needle of ['Tops', 'Bottoms', 'Onepiece', 'Shoes', 'CatEar', 'GlassesLowFrame', 'Body_00_SKIN', 'HairBack', 'Hair_00']) {
    const idxs = doc.json.materials.map((m, i) => [m.name, i]).filter(([n]) => n.includes(needle));
    for (const [name, mi] of idxs) {
      const prims = V.primsOfMaterial(doc, mi); if (!prims.length) continue;
      const geos = prims.map(([m, p]) => B.primitiveGeometry(doc, m, p));
      const imgIndex = V.mainImage(doc, mi); const im = doc.json.images[imgIndex];
      const img = await B.decodeImage(doc.views[im.bufferView], im.mimeType);
      const W = Math.min(img.width, 1024), H = Math.min(img.height, 1024 * img.height / img.width);
      const res = B.bakeUV(renderer, { geometries: geos, width: W, height: H, baseBitmap: img.bitmap, design: DEBUG });
      const { rgba } = B.composite(res, img);
      const short = name.replace(/ \(Instance\)/, '').replace(/^N00_\d+_\d+_/, '');
      images['uv_' + short] = B.previewURL(rgba, W, H, 1024);
      // bounds in character space (front +Z, left +X)
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (const g of geos) {
        const pos = g.attributes.position.array; const idx = g.index.array;
        for (let k = 0; k < idx.length; k++) { const v = idx[k] * 3; const q = [-pos[v], pos[v + 1], -pos[v + 2]]; for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], q[a]); mx[a] = Math.max(mx[a], q[a]); } }
      }
      out.materials.push({ name, index: mi, image: imgIndex, size: [img.width, img.height], alpha: B.hasAlpha(img), tris: geos.reduce((s, g) => s + g.index.count / 3, 0),
        min: mn.map((x) => +x.toFixed(3)), max: mx.map((x) => +x.toFixed(3)), mtoon: V.mtoon(doc, mi).floatProperties._BlendMode });
      log('inspected ' + name);
    }
  }
}
