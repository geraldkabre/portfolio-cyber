// Converts skeleton-independent humanoid clips (see tools/char-lab/studio/bake-clips.html) into
// THREE.AnimationClip objects that drive the *normalized* humanoid bones of a loaded VRM (three-vrm 3.x).
//
// Data convention (format "cyberverse-humanoid-clips@1"):
//   clip.q[bone]  = per-frame WORLD rotation of the bone relative to its T-pose rest, +Z forward / +Y up, [x,y,z,w]...
//                   (a single key when the bone does not move)
//   clip.hipsP    = per-frame hips offset (metres, source skeleton) from its rest position
// Normalized VRM bones have identity rest rotations, so local = inverse(parentWorldDelta) * worldDelta, where the
// parent is the nearest humanoid ancestor that exists in *this* model (works whether or not it has upperChest, etc.).
import * as THREE from 'three';

const _a = new THREE.Quaternion(), _b = new THREE.Quaternion();

function readQ(arr, frame, out) {
  const i = arr.length === 4 ? 0 : frame * 4;
  return out.set(arr[i], arr[i + 1], arr[i + 2], arr[i + 3]);
}

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm  loaded VRM (before or after VRMUtils.rotateVRM0)
 * @param {object} data  parsed clips JSON
 * @param {{ only?: string[] }} [opts]
 * @returns {Map<string, THREE.AnimationClip>}
 */
export function buildHumanoidClips(vrm, data, opts = {}) {
  if (data.format !== 'cyberverse-humanoid-clips@1') throw new Error('unsupported clip format ' + data.format);
  const humanoid = vrm.humanoid;
  const vrm0 = vrm.meta?.metaVersion === '0';            // VRM 0.x normalized space faces -Z: rotate 180 deg around Y
  const nodeOf = (b) => humanoid.getNormalizedBoneNode(b);
  const bones = data.bones.filter((b) => nodeOf(b));
  const boneOfNode = new Map(bones.map((b) => [nodeOf(b), b]));
  const parentOf = new Map(bones.map((b) => {
    let n = nodeOf(b).parent; while (n && !boneOfNode.has(n)) n = n.parent;
    return [b, n ? boneOfNode.get(n) : null];
  }));
  const hipsNode = nodeOf('hips');
  const hipsRest = hipsNode.position.clone();
  hipsNode.parent?.updateWorldMatrix(true, false);
  const hipsWorldY = hipsNode.getWorldPosition(new THREE.Vector3()).y - (vrm.scene.getWorldPosition(new THREE.Vector3()).y);
  const scale = hipsWorldY / data.hipsRestHeight;

  const clips = new Map();
  for (const [name, c] of Object.entries(data.clips)) {
    if (opts.only && !opts.only.includes(name)) continue;
    const times = new Float32Array(c.frames); for (let i = 0; i < c.frames; i++) times[i] = Math.min(c.duration, i / data.fps);
    const tracks = [];
    const world = new Map(bones.map((b) => [b, new THREE.Quaternion()]));
    const values = new Map(bones.map((b) => [b, new Float32Array(c.frames * 4)]));
    for (let f = 0; f < c.frames; f++) {
      for (const b of bones) {
        const q = world.get(b);
        if (c.q[b]) readQ(c.q[b], f, q); else q.identity();
        if (vrm0) q.set(-q.x, q.y, -q.z, q.w);
      }
      for (const b of bones) {
        const p = parentOf.get(b);
        _a.copy(world.get(b));
        if (p) _a.premultiply(_b.copy(world.get(p)).invert());
        values.get(b).set([_a.x, _a.y, _a.z, _a.w], f * 4);
      }
    }
    for (const b of bones) {
      const v = values.get(b); let moving = false;
      for (let i = 4; i < v.length && !moving; i++) if (Math.abs(v[i] - v[i % 4]) > 1e-4) moving = true;
      if (!moving && Math.abs(v[3]) > 0.99999) continue;          // identity for the whole clip: no track needed
      tracks.push(new THREE.QuaternionKeyframeTrack(`${nodeOf(b).name}.quaternion`, moving ? times : [0], moving ? v : v.slice(0, 4)));
    }
    const pos = new Float32Array(c.frames * 3);
    for (let f = 0; f < c.frames; f++) {
      let x = c.hipsP[f * 3] * scale, y = c.hipsP[f * 3 + 1] * scale, z = c.hipsP[f * 3 + 2] * scale;
      if (vrm0) { x = -x; z = -z; }
      pos.set([hipsRest.x + x, hipsRest.y + y, hipsRest.z + z], f * 3);
    }
    const hipsTrack = new THREE.VectorKeyframeTrack(`${hipsNode.name}.position`, times, pos);
    tracks.push(hipsTrack);
    const clip = new THREE.AnimationClip(name, c.duration, tracks);
    if (opts.ground !== false && c.ground && c.ground !== 'none') groundClip(vrm, clip, hipsTrack, c.ground);
    clips.set(name, clip);
  }
  humanoid.resetNormalizedPose();
  return clips;
}

/**
 * Foot grounding: the source skeleton has other leg proportions, so scaling the hips translation by the hips-height
 * ratio leaves the feet slightly inside or above the floor. The clip is evaluated on this model; the lowest foot
 * contact (foot or toe bone vs. its rest height) is measured per frame and the hips track is corrected:
 *   'feet' -> per-frame correction (a foot is always planted), 'min' -> one constant offset (keeps airborne phases).
 */
function groundClip(vrm, clip, hipsTrack, mode) {
  const h = vrm.humanoid;
  h.resetNormalizedPose(); h.update(); vrm.scene.updateMatrixWorld(true);
  // virtual sole points (heel, ball, tip) at ground level in the rest pose, rigidly attached to the foot / toes bones
  const points = [];
  for (const side of ['left', 'right']) {
    const foot = h.getRawBoneNode(`${side}Foot`), toes = h.getRawBoneNode(`${side}Toes`);
    if (!foot) continue;
    const f = foot.getWorldPosition(new THREE.Vector3()), t = toes ? toes.getWorldPosition(new THREE.Vector3()) : f.clone().add(new THREE.Vector3(0, 0, 0.12));
    const fwd = new THREE.Vector3(t.x - f.x, 0, t.z - f.z); const len = Math.max(fwd.length(), 0.05); fwd.normalize();
    const sole = (p) => new THREE.Vector3(p.x, 0, p.z);
    for (const [bone, w] of [[foot, sole(f).addScaledVector(fwd, -0.47 * len)], [foot, sole(f)], [toes || foot, sole(t)], [toes || foot, sole(t).addScaledVector(fwd, 0.5 * len)]]) {
      points.push({ bone, local: bone.worldToLocal(w.clone()), restY: w.y });
    }
  }
  if (!points.length) return;
  const v = new THREE.Vector3();
  const mixer = new THREE.AnimationMixer(vrm.scene);
  const action = mixer.clipAction(clip); action.play();
  const n = hipsTrack.times.length; const contact = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mixer.setTime(hipsTrack.times[i]); h.update(); vrm.scene.updateMatrixWorld(true);
    let low = Infinity; for (const p of points) low = Math.min(low, p.bone.localToWorld(v.copy(p.local)).y - p.restY);
    contact[i] = low;
  }
  action.stop(); mixer.uncacheRoot(vrm.scene);
  const minC = Math.min(...contact);
  for (let i = 0; i < n; i++) hipsTrack.values[i * 3 + 1] -= mode === 'feet' ? contact[i] : minC;
  clip.userData = { ...(clip.userData || {}), grounding: { mode, before: [+minC.toFixed(4), +Math.max(...contact).toFixed(4)] } };
}
