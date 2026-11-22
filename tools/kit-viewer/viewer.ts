// Dev-only contact sheet of kit pieces rendered with the runtime material library.
// /tools/kit-viewer/index.html?kit=megakit&filter=^Wall&tile=200&cols=8
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Kit } from '../../src/world/kit';
import { MaterialLibrary } from '../../src/world/materials';

declare global { interface Window { __ready?: boolean; __info?: unknown } }

const q = new URLSearchParams(location.search);
const kitName = q.get('kit') ?? 'megakit';
const filter = new RegExp(q.get('filter') ?? '.');
const tile = Number(q.get('tile') ?? 200);
const cols = Number(q.get('cols') ?? 8);
const tier = (q.get('tier') ?? '1k') as '1k' | '2k';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setScissorTest(true);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;
scene.add(new THREE.HemisphereLight('#9fb6ff', '#141a2a', 0.8));
const sun = new THREE.DirectionalLight('#ffffff', 2.2);
sun.position.set(3, 6, 4);
scene.add(sun);

const lib = new MaterialLibrary(tier, renderer.capabilities.getMaxAnisotropy());
const kit = await Kit.load(kitName, lib);
await lib.ready();

const names = kit.pieces(filter).sort();
const rows = Math.ceil(names.length / cols);
const W = cols * tile, H = rows * tile;
renderer.setSize(W, H);
const grid = document.getElementById('grid')!;
grid.style.gridTemplateColumns = `repeat(${cols}, ${tile}px)`;
grid.style.gridAutoRows = `${tile}px`;

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 500);
const dir = new THREE.Vector3(...(q.get("dir") ?? "1.1,0.75,1.5").split(",").map(Number)).normalize();
renderer.setClearColor('#0e1424');

names.forEach((name, i) => {
  const info = kit.manifest[name];
  const el = document.createElement('div');
  el.className = 'tile';
  el.innerHTML = `<span>${name}</span><em>${info.size.map((v) => v.toFixed(1)).join('x')} | ${info.tris}</em>`;
  grid.appendChild(el);

  const obj = kit.instance(name);
  scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.05);
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(15)) * 0.95;
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = dist / 100; camera.far = dist * 10;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  const x = (i % cols) * tile, y = H - (Math.floor(i / cols) + 1) * tile;
  renderer.setViewport(x, y, tile, tile);
  renderer.setScissor(x, y, tile, tile);
  renderer.render(scene, camera);
  scene.remove(obj);
});

window.__info = { count: names.length, missing: [...lib.missing], gl: renderer.getContext().getParameter(renderer.getContext().VERSION) };
window.__ready = true;
