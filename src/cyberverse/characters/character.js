// Runtime loader for CYBERVERSE player characters (VRM 0.x / 1.0 through three-vrm 3.x).
//   const hero = await loadCharacter(CHARACTERS.female.url, clipsData);
//   scene.add(hero.root); hero.play('Idle_Loop');
//   // every frame: hero.update(dt)
// vrm.update(dt) MUST run every frame (and once before the first render): it syncs MToon uniforms such as the
// alpha cutoff, drives spring bones (hair, accessories) and applies the normalized pose to the real skeleton.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { buildHumanoidClips } from './humanoidClips.js';

let sharedLoader = null;
function loader() {
  if (!sharedLoader) { sharedLoader = new GLTFLoader(); sharedLoader.register((p) => new VRMLoaderPlugin(p)); }
  return sharedLoader;
}

/** Loads the clips JSON once and shares it between characters. */
const clipCache = new Map();
export function loadClipData(url) {
  if (!clipCache.has(url)) clipCache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`clips ${r.status}`); return r.json(); }));
  return clipCache.get(url);
}

export async function loadCharacter(url, clipData, { onProgress, clips: only } = {}) {
  const gltf = await loader().loadAsync(url, onProgress);
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error('not a VRM file: ' + url);
  if (VRMUtils.combineSkeletons) VRMUtils.combineSkeletons(gltf.scene);     // one bone texture instead of one per mesh
  VRMUtils.rotateVRM0(vrm);                                                  // VRM 0.x faces -Z: make every model face +Z
  vrm.scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });  // skinned bounds do not follow animation
  const clips = clipData ? buildHumanoidClips(vrm, clipData, { only }) : new Map();
  const mixer = new THREE.AnimationMixer(vrm.scene);
  const actions = new Map([...clips].map(([n, c]) => [n, mixer.clipAction(c)]));
  for (const [n, a] of actions) if (!clipData.clips[n].loop) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
  let current = null;
  vrm.update(0);

  return {
    vrm, root: vrm.scene, mixer, clips, actions,
    get current() { return current; },
    /** Cross-fades to a clip. */
    play(name, { fade = 0.25, timeScale = 1 } = {}) {
      const next = actions.get(name); if (!next) throw new Error('unknown clip ' + name);
      if (next === current) return next;
      next.reset().setEffectiveTimeScale(timeScale).setEffectiveWeight(1).play();
      if (current && fade > 0) current.crossFadeTo(next, fade, false); else if (current) current.stop();
      current = next; return next;
    },
    update(dt) { mixer.update(dt); vrm.update(dt); },
    dispose() { mixer.stopAllAction(); VRMUtils.deepDispose(vrm.scene); },
  };
}
