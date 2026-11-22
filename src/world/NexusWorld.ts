import * as THREE from 'three';
import type { Engine } from '../engine/Engine';
import { CollisionWorld } from '../engine/Collision';
import { MaterialLibrary } from './materials';
import { Kit } from './kit';
import { createCloudSea, createSky } from './atmosphere';
import { createIsland } from './island';
import { createCommandCenter } from './commandCenter';
import { createDestinations } from './destinations';
import { createDistricts } from './districts';
import { createProps } from './props';
import { createLighting } from './lighting';
import { batchStatic } from './batch';
import { FX_TIME } from './fx';
import { LAYOUT } from './layout';

export interface Interactable {
  id: 'dossier' | 'brief';
  position: THREE.Vector3;
  radius: number;
  prompt: string;
}

/** Nexus Prime: the first playable island of the Sentinel Nexus (Milestone 3). */
export class NexusWorld {
  readonly root = new THREE.Group();
  collision!: CollisionWorld;
  interactables: Interactable[] = [];
  lighting!: ReturnType<typeof createLighting>;
  cc!: ReturnType<typeof createCommandCenter>;
  destinations!: ReturnType<typeof createDestinations>;
  props!: ReturnType<typeof createProps>;
  stats = { staticTriangles: 0, staticBatches: 0, colliderTriangles: 0 };
  private updaters: ((dt: number, t: number) => void)[] = [];
  private sky!: ReturnType<typeof createSky>;
  materials!: MaterialLibrary;

  static async create(engine: Engine, onProgress: (p: number, label: string) => void) {
    const w = new NexusWorld();
    await w.build(engine, onProgress);
    return w;
  }

  private async build(engine: Engine, onProgress: (p: number, label: string) => void) {
    const { scene, renderer } = engine;
    this.root.name = 'nexus-prime';
    this.materials = new MaterialLibrary(engine.quality.textureTier, Math.min(8, engine.maxAnisotropy));
    let mp = 0, cp = 0;
    const report = () => onProgress(0.6 * mp + 0.4 * cp, 'Environment');
    const [mega, cyber] = await Promise.all([
      Kit.load('megakit', this.materials, (p) => { mp = p; report(); }),
      Kit.load('cyberkit', this.materials, (p) => { cp = p; report(); }),
    ]);
    await this.materials.ready();
    onProgress(1, 'Environment');

    this.lighting = createLighting(renderer, scene, engine.quality.shadowMapSize);
    this.root.add(this.lighting.group);

    this.sky = createSky(renderer);
    const clouds = createCloudSea(renderer);
    this.root.add(this.sky.mesh, clouds.mesh);

    const island = createIsland(this.materials);
    this.cc = createCommandCenter(mega, this.materials);
    this.destinations = createDestinations(mega, cyber);
    this.props = createProps(mega, cyber, engine.quality.particles);
    const districts = createDistricts();

    // Static architecture -> a few merged draw calls.
    const staticRoot = new THREE.Group();
    staticRoot.add(this.cc.staticGroup, this.destinations.staticGroup, this.props.staticGroup);
    const batched = batchStatic(staticRoot, 'nexus-static');
    this.stats.staticTriangles = batched.userData.triangles;
    this.stats.staticBatches = batched.userData.batches;
    this.destinations.dynamic.name = 'dest-dynamic';
    this.props.dynamic.name = 'props-dynamic';
    this.root.add(island.group, batched, this.cc.dynamic, this.destinations.dynamic, this.props.dynamic, districts.group);
    scene.add(this.root);

    engine.refreshShadows();
    this.collision = new CollisionWorld([island.colliders, this.cc.colliders, this.destinations.colliders, this.props.colliders]);
    this.stats.colliderTriangles = this.collision.triangleCount;

    this.interactables = [
      { id: 'dossier', position: this.cc.dossierPosition, radius: 3.4, prompt: 'Access the operator dossier' },
      { id: 'brief', position: this.destinations.briefPosition, radius: 3.0, prompt: 'Read the district brief' },
    ];

    this.updaters.push(
      (_dt, t) => { FX_TIME.value = t; clouds.update(t); },
      (_dt, t) => island.update(t),
      (dt, t) => this.cc.update(dt, t),
      (dt, t) => this.destinations.update(dt, t),
      (dt, t) => this.props.update(dt, t),
    );
    // Procedural parts may have requested extra textures after the kits: wait for them too (no pop-in).
    await this.materials.ready();
    if (this.materials.missing.size) console.warn('[world] missing materials:', [...this.materials.missing]);
  }

  /** Spawn transform on the arrival pad. */
  get spawn() {
    return { position: LAYOUT.spawn.clone(), yaw: LAYOUT.spawnYaw };
  }

  update(dt: number, t: number, camera: THREE.Camera) {
    this.sky.update(t, camera);
    for (const u of this.updaters) u(dt, t);
  }

}
