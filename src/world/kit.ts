import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { MaterialLibrary } from './materials';

export interface PieceInfo {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  tris: number;
  materials: string[];
}

/**
 * A modular kit (one GLB, one root node per piece). Pieces are cloned on demand and share
 * geometry + art-directed materials; the world later merges static clones per material.
 */
/** Places a kit piece (position, Y rotation, uniform or per-axis scale). */
export interface Placement { x: number; y: number; z: number; rotY?: number; scale?: number | [number, number, number] }

export function place(kit: Kit, name: string, p: Placement) {
  const o = kit.instance(name);
  o.position.set(p.x, p.y, p.z);
  o.rotation.y = p.rotY ?? 0;
  if (p.scale !== undefined) {
    if (Array.isArray(p.scale)) o.scale.set(...p.scale); else o.scale.setScalar(p.scale);
  }
  return o;
}

/** Enables shadow casting on every mesh under `root` (architecture, large props). */
export function castShadows(root: THREE.Object3D) {
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return root;
}

export class Kit {
  private constructor(
    readonly name: string,
    private readonly templates: Map<string, THREE.Object3D>,
    readonly manifest: Record<string, PieceInfo>,
    readonly animations: THREE.AnimationClip[],
  ) {}

  static async load(name: string, materials: MaterialLibrary, onProgress?: (p: number) => void): Promise<Kit> {
    const base = `/assets/environments/${name}/`;
    const [gltf, manifest] = await Promise.all([
      new GLTFLoader().loadAsync(`${base}${name}.glb`, (e) => onProgress?.(e.total ? e.loaded / e.total : 0)),
      fetch(`${base}manifest.json`).then((r) => r.json() as Promise<Record<string, PieceInfo>>),
    ]);
    const templates = new Map<string, THREE.Object3D>();
    for (const piece of [...gltf.scene.children]) {
      piece.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const swap = (m: THREE.Material) => materials.get(m.name);
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
        mesh.castShadow = false; // opt-in per piece (see castShadows): the shadow pass is the most expensive one
        mesh.receiveShadow = true;
      });
      templates.set(piece.name, piece);
    }
    return new Kit(name, templates, manifest, gltf.animations);
  }

  has(piece: string) {
    return this.templates.has(piece);
  }

  pieces(filter?: RegExp) {
    return [...this.templates.keys()].filter((n) => !filter || filter.test(n));
  }

  /** Returns a clone positioned at the origin (pieces keep their authored pivot). */
  instance(piece: string): THREE.Object3D {
    const t = this.templates.get(piece);
    if (!t) throw new Error(`${this.name}: unknown piece ${piece}`);
    let skinned = false;
    t.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true; });
    // Skinned pieces need SkeletonUtils so the clone gets its own bones.
    const c = skinned ? cloneSkinned(t) : t.clone(true);
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    c.scale.set(1, 1, 1);
    return c;
  }
}
