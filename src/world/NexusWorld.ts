import * as THREE from 'three';
import type { Engine } from '../engine/Engine';
import { CollisionWorld } from '../engine/Collision';
import { MaterialLibrary } from './materials';
import { Kit } from './kit';
import { ATMOSPHERE, createCloudSea, createSky } from './atmosphere';
import { createIsland } from './island';
import { createCommandCenter } from './commandCenter';
import { createCampus, type Arrival, type Portal } from './campusWorld';
import { createDistricts } from './districts';
import { createProps } from './props';
import { createLighting } from './lighting';
import { batchStatic } from './batch';
import { FX_TIME } from './fx';
import { LAYOUT } from './layout';
import { SITES } from './campus';
import type { PanelKey } from '../content/profile';

export interface Interactable {
  id: string;
  panel: PanelKey;
  position: THREE.Vector3;
  radius: number;
  prompt: string;
}

/** The Sentinel Nexus: Nexus Prime (Command Center) + six district islands reached through portals. */
export class NexusWorld {
  readonly root = new THREE.Group();
  collision!: CollisionWorld;
  interactables: Interactable[] = [];
  portals: Portal[] = [];
  lighting!: ReturnType<typeof createLighting>;
  cc!: ReturnType<typeof createCommandCenter>;
  campus!: ReturnType<typeof createCampus>;
  props!: ReturnType<typeof createProps>;
  stats = { staticTriangles: 0, staticBatches: 0, colliderTriangles: 0 };
  /** Island the operator is on: 'command' (Nexus Prime) or a district id. */
  active = 'command';
  private updaters: ((dt: number, t: number) => void)[] = [];
  private sky!: ReturnType<typeof createSky>;
  private districts!: ReturnType<typeof createDistricts>;
  private engine!: Engine;
  materials!: MaterialLibrary;

  static async create(engine: Engine, onProgress: (p: number, label: string) => void) {
    const w = new NexusWorld();
    await w.build(engine, onProgress);
    return w;
  }

  private async build(engine: Engine, onProgress: (p: number, label: string) => void) {
    const { scene, renderer } = engine;
    this.engine = engine;
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

    // Data lanes on the Nexus deck lead to the six portals and down the arrival avenue.
    const island = createIsland(this.materials, { lanes: [...SITES.map((s) => s.az), 180] });
    this.cc = createCommandCenter(mega, this.materials);
    this.props = createProps(mega, cyber, engine.quality.particles);
    this.campus = createCampus(mega, cyber, this.materials);
    this.districts = createDistricts();

    const staticRoot = new THREE.Group();
    staticRoot.add(this.cc.staticGroup, this.props.staticGroup);
    const batched = batchStatic(staticRoot, 'nexus-static');
    this.stats.staticTriangles = batched.userData.triangles;
    this.stats.staticBatches = batched.userData.batches;
    this.props.dynamic.name = 'props-dynamic';
    this.root.add(island.group, batched, this.cc.dynamic, this.props.dynamic, this.districts.group, this.campus.root);
    scene.add(this.root);

    this.collision = new CollisionWorld([island.colliders, this.cc.colliders, this.props.colliders, this.campus.colliders]);
    this.stats.colliderTriangles = this.collision.triangleCount;
    this.portals = this.campus.portals;
    this.interactables = [
      { id: 'command', panel: 'profile', position: this.cc.dossierPosition, radius: 3.4, prompt: 'Open: profile — operator dossier' },
      ...this.campus.terminals,
    ];
    this.setActive('command');

    this.updaters.push(
      (_dt, t) => { FX_TIME.value = t; clouds.update(t); },
      (_dt, t) => island.update(t),
      (dt, t) => this.cc.update(dt, t),
      (dt, t) => this.props.update(dt, t),
      (_dt, t) => this.campus.update(t, this.active),
    );
    await this.materials.ready();
    if (this.materials.missing.size) console.warn('[world] missing materials:', [...this.materials.missing]);
  }

  /** Spawn transform on the arrival pad. */
  get spawn(): Arrival {
    return { position: LAYOUT.spawn.clone(), yaw: LAYOUT.spawnYaw };
  }

  /** Where fast travel / portals place the operator. */
  arrival(id: string, from?: string): Arrival {
    if (id === 'command') {
      const back = from ? this.campus.nexusArrivals.get(from) : undefined;
      return back ? { position: back.position.clone(), yaw: back.yaw } : this.spawn;
    }
    const d = this.campus.districts.find((x) => x.id === id)!;
    return { position: d.arrival.position.clone(), yaw: d.arrival.yaw };
  }

  /**
   * Switches the detailed island (others become distant silhouettes) and recentres the static shadow map on it
   * (rendered once per change).
   */
  setActive(id: string) {
    this.active = id;
    this.campus.setActive(id);
    this.districts.setActive(id);
    const c = id === 'command' ? new THREE.Vector3() : this.campus.districts.find((d) => d.id === id)!.center;
    const moon = this.lighting.moon;
    moon.target.position.copy(c);
    moon.position.copy(c).addScaledVector(ATMOSPHERE.moonDir, 90);
    moon.target.updateMatrixWorld();
    this.engine.refreshShadows();
  }

  update(dt: number, t: number, camera: THREE.Camera) {
    this.sky.update(t, camera);
    for (const u of this.updaters) u(dt, t);
  }
}
