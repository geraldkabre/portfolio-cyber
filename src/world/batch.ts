import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { normalizeForMerge } from './geometry';

/**
 * Static batching: merges every static mesh under `root` into one mesh per material (world space).
 * Turns hundreds of kit sub-meshes into a few draw calls; instanced and skinned meshes are kept as they are.
 */
export function batchStatic(root: THREE.Object3D, name = 'static-batch') {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, { material: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean }>();
  const kept: THREE.Object3D[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || !mesh.visible) { kept.push(mesh); return; }
    const material = mesh.material as THREE.Material;
    if (Array.isArray(mesh.material)) { kept.push(mesh); return; }
    const g = normalizeForMerge(mesh.geometry.clone());
    g.applyMatrix4(mesh.matrixWorld);
    if (mesh.matrixWorld.determinant() < 0) {
      const idx = g.index!;
      for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); }
    }
    // One bucket per (material, caster): non-casting geometry stays out of the shadow pass.
    const key = `${material.uuid}|${mesh.castShadow ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) { b = { material, geos: [], cast: mesh.castShadow }; buckets.set(key, b); }
    b.geos.push(g);
  });
  const out = new THREE.Group();
  out.name = name;
  let triangles = 0;
  for (const { material, geos, cast } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, material);
    m.castShadow = cast && !(material as THREE.MeshStandardMaterial).transparent;
    m.receiveShadow = true;
    m.name = `${name}:${material.name}`;
    out.add(m);
    triangles += (merged.index?.count ?? 0) / 3;
  }
  for (const k of kept) {
    k.updateWorldMatrix(true, false);
    const clone = k;
    clone.matrix.copy(k.matrixWorld);
    clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
    out.add(clone);
  }
  out.userData.triangles = triangles;
  out.userData.batches = buckets.size;
  return out;
}
