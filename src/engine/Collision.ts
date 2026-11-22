import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plainAttribute } from '../world/geometry';

const _box = new THREE.Box3();
const _triPoint = new THREE.Vector3();
const _capPoint = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _ray = new THREE.Ray();

/**
 * Static collision world: every collider mesh is baked (world space, positions only) into one BVH.
 * - capsule push-out for the character (walls, floors, ramps),
 * - downward probe for ground snapping,
 * - ray cast for camera collision.
 */
export class CollisionWorld {
  readonly geometry: THREE.BufferGeometry;
  readonly bvh: MeshBVH;

  constructor(objects: THREE.Object3D[]) {
    const parts: THREE.BufferGeometry[] = [];
    for (const root of objects) {
      root.updateWorldMatrix(true, true);
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || mesh.userData.noCollide) return;
        const src = mesh.geometry;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', plainAttribute(src.getAttribute('position')).clone());
        if (src.index) g.setIndex(src.index.clone());
        g.applyMatrix4(mesh.matrixWorld);
        parts.push(g);
      });
    }
    const indexed = parts.map((g) => {
      if (g.index) return g;
      const n = g.getAttribute('position').count;
      g.setIndex([...Array(n).keys()]);
      return g;
    });
    this.geometry = mergeGeometries(indexed, false) ?? new THREE.BufferGeometry();
    this.bvh = new MeshBVH(this.geometry);
  }

  get triangleCount() {
    return (this.geometry.index?.count ?? 0) / 3;
  }

  /**
   * Pushes the capsule segment out of every intersecting triangle (iterative, in place).
   * Returns true when any contact happened.
   */
  collideCapsule(segment: THREE.Line3, radius: number): boolean {
    _box.makeEmpty();
    _box.expandByPoint(segment.start);
    _box.expandByPoint(segment.end);
    _box.min.addScalar(-radius);
    _box.max.addScalar(radius);
    let hit = false;
    this.bvh.shapecast({
      intersectsBounds: (box) => box.intersectsBox(_box),
      intersectsTriangle: (tri) => {
        const distance = tri.closestPointToSegment(segment, _triPoint, _capPoint);
        if (distance < radius) {
          const depth = radius - distance;
          _dir.subVectors(_capPoint, _triPoint);
          if (_dir.lengthSq() < 1e-12) _dir.copy(tri.getNormal(new THREE.Vector3()));
          _dir.normalize();
          segment.start.addScaledVector(_dir, depth);
          segment.end.addScaledVector(_dir, depth);
          hit = true;
        }
        return false;
      },
    });
    return hit;
  }

  /** Distance to the first hit along a ray, or null. */
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, far: number): number | null {
    _ray.origin.copy(origin);
    _ray.direction.copy(direction).normalize();
    const hit = this.bvh.raycastFirst(_ray, THREE.DoubleSide);
    return hit && hit.distance <= far ? hit.distance : null;
  }

  /** Highest walkable surface below (x, fromY, z) within maxDown; returns its height and normal.y. */
  ground(x: number, fromY: number, z: number, maxDown: number): { y: number; normalY: number } | null {
    _ray.origin.set(x, fromY, z);
    _ray.direction.set(0, -1, 0);
    const hit = this.bvh.raycastFirst(_ray, THREE.DoubleSide);
    if (!hit || hit.distance > maxDown) return null;
    const ny = hit.face ? Math.abs(hit.face.normal.y) : 1;
    return { y: hit.point.y, normalY: ny };
  }

  /** Wireframe overlay for debugging (?debug=colliders). */
  debugMesh() {
    return new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ color: '#ff3d7f', wireframe: true, transparent: true, opacity: 0.35, depthTest: false }));
  }
}
