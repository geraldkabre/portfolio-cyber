// Dev-only: renders Nexus Prime from fixed camera shots for visual review.
// /tools/world-viewer/index.html?shots=name:px,py,pz:tx,ty,tz;name2:...&quality=high&t=4
import { Engine } from '../../src/engine/Engine';
import { NexusWorld } from '../../src/world/NexusWorld';
import type { QualityLevel } from '../../src/engine/quality';

declare global { interface Window { __ready?: boolean; __info?: unknown; __shot?: (name: string) => Promise<string> } }

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const engine = new Engine(canvas, (q.get('quality') ?? 'high') as QualityLevel);
const t0 = performance.now();
const world = await NexusWorld.create(engine, () => undefined);
const loadMs = performance.now() - t0;
if (q.has('colliders')) engine.scene.add(world.collision.debugMesh());

const shots = (q.get('shots') ?? 'hero:0,4.5,38:0,9,0').split(';').map((s) => {
  const [name, p, t, active] = s.split(':');
  return { name, p: p.split(',').map(Number), t: t.split(',').map(Number), active: active ?? 'command' };
});
const time = Number(q.get('t') ?? 4);
const cam = engine.camera;
cam.fov = Number(q.get('fov') ?? 55);
cam.updateProjectionMatrix();

function setShot(i: number) {
  const s = shots[i];
  cam.position.set(s.p[0], s.p[1], s.p[2]);
  cam.lookAt(s.t[0], s.t[1], s.t[2]);
  if (world.active !== s.active) world.setActive(s.active);
}
// Warm up: advance simulated time so animations/effects are in a representative state.
setShot(0);
engine.onUpdate((dt, t) => world.update(dt, t, cam), 30);
for (let i = 0; i < Math.round(time * 30); i++) engine.frame(performance.now(), 1 / 30);

window.__shot = async (name: string) => {
  const i = shots.findIndex((s) => s.name === name);
  setShot(i);
  for (let k = 0; k < 3; k++) engine.frame(performance.now(), 1 / 30);
  return name;
};
const st = engine.stats();
window.__info = { loadMs: Math.round(loadMs), shots: shots.map((s) => s.name), drawCalls: st.drawCalls, triangles: st.triangles, ...world.stats, missing: [...world.materials.missing] };
window.__ready = true;
