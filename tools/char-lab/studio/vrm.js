// VRM 0.x material helpers on top of glb.js documents.
export const vrmExt = (doc) => doc.json.extensions.VRM;

export function findMaterial(doc, needle) {
  const i = doc.json.materials.findIndex((m) => m.name.includes(needle));
  if (i < 0) throw new Error('material not found: ' + needle);
  return i;
}
export const mtoon = (doc, matIndex) => vrmExt(doc).materialProperties[matIndex];
export const texImage = (doc, texIndex) => { const t = doc.json.textures[texIndex]; return t.extensions?.EXT_texture_webp?.source ?? t.source; };
export const mainImage = (doc, matIndex) => texImage(doc, mtoon(doc, matIndex).textureProperties._MainTex);

export function primsOfMaterial(doc, matIndex) {
  const out = [];
  doc.json.meshes.forEach((m, mi) => m.primitives.forEach((p, pi) => { if (p.material === matIndex) out.push([mi, pi]); }));
  return out;
}

/** Patch MToon properties. Vectors are [r,g,b,a] in the MToon (gamma/sRGB) convention used by UniVRM 0.x. */
export function setMToon(doc, matIndex, { vector = {}, float = {}, texture = {}, keyword = {}, tag = {} } = {}) {
  const m = mtoon(doc, matIndex);
  Object.assign(m.vectorProperties, vector); Object.assign(m.floatProperties, float);
  Object.assign(m.textureProperties, texture); Object.assign(m.keywordMap, keyword); Object.assign(m.tagMap, tag);
  // keep the plain glTF material roughly in sync for non-VRM viewers
  const g = doc.json.materials[matIndex];
  if (texture._EmissionMap !== undefined) { g.emissiveTexture = { index: texture._EmissionMap }; g.emissiveFactor = (vector._EmissionColor || m.vectorProperties._EmissionColor || [1, 1, 1]).slice(0, 3); }
  if (vector._Color) { g.pbrMetallicRoughness = g.pbrMetallicRoughness || {}; g.pbrMetallicRoughness.baseColorFactor = vector._Color; }
}

/** Humanoid bone names used by the recipes. */
export const HUMAN_BONES = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes', 'leftEye', 'rightEye'];
