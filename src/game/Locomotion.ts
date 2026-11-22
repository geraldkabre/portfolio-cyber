import * as THREE from 'three';
import type { CharacterHandle } from '../cyberverse/characters/character.js';
import { LOCOMOTION } from '../cyberverse/characters/characters.js';

/** Root-motion speeds of the UAL clips (m/s), measured on UAL1_Standard_RM.glb (mannequin hips at 0.9167 m). */
export const UAL_SPEED = { walk: 0.975, run: 5.357, sprint: 8.25 } as const;
export const UAL_HIPS = 0.9167;

type Moving = 'walk' | 'run' | 'sprint';
type Slot = 'idle' | Moving | 'air' | 'land';
const SLOTS: Slot[] = ['idle', 'walk', 'run', 'sprint', 'air', 'land'];
const MOVING: Moving[] = ['walk', 'run', 'sprint'];
const CLIP: Record<Slot, string> = {
  idle: LOCOMOTION.idle, walk: LOCOMOTION.walk, run: LOCOMOTION.run, sprint: LOCOMOTION.sprint,
  air: LOCOMOTION.jumpLoop, land: LOCOMOTION.jumpLand,
};

export interface LocomotionInput {
  /** Horizontal speed (m/s). */
  speed: number;
  /** Airborne long enough to show the jump loop. */
  air: boolean;
  /** Landing after a jump or a fall. */
  landing: boolean;
  /** Gameplay speeds the blend space is anchored to (walk / run / sprint, m/s). */
  anchors: { walk: number; run: number; sprint: number };
}

const smooth01 = (a: number, b: number, v: number) => THREE.MathUtils.smoothstep(v, a, b);

/** Foot-phase offsets per character, measured once (behind the loading screen, see Locomotion.prepare). */
const measured = new WeakMap<CharacterHandle, Record<'walk' | 'run' | 'sprint', number>>();

/**
 * Continuous locomotion blend (replaces discrete clip switches):
 * - walk / jog / sprint loops run together as a 1D blend space weighted by speed, idle fades in near rest;
 * - the three loops share one gait phase, aligned on the moment the left foot is furthest forward (measured on
 *   the clips at load), so blending never crosses the legs;
 * - the phase advances with the ground speed divided by the blended stride length (no foot sliding);
 * - weights ease towards their targets and always sum to 1 (no bind-pose bleed, no pops).
 */
export class Locomotion {
  private readonly actions = new Map<Slot, THREE.AnimationAction>();
  private readonly weight: Record<Slot, number> = { idle: 1, walk: 0, run: 0, sprint: 0, air: 0, land: 0 };
  private readonly target: Record<Slot, number> = { idle: 1, walk: 0, run: 0, sprint: 0, air: 0, land: 0 };
  private readonly duration: Record<Moving, number> = { walk: 1, run: 1, sprint: 1 };
  /** Normalised time where each loop has its left foot furthest forward. */
  readonly offset: Record<Moving, number> = { walk: 0, run: 0, sprint: 0 };
  private phase = 0;
  private wasLanding = false;

  constructor(private readonly handle: CharacterHandle, private readonly stride: number) {
    for (const s of SLOTS) {
      const a = handle.actions.get(CLIP[s]);
      if (!a) throw new Error(`missing clip ${CLIP[s]}`);
      this.actions.set(s, a);
    }
    for (const m of MOVING) this.duration[m] = this.actions.get(m)!.getClip().duration;
    const known = measured.get(handle);
    if (known) Object.assign(this.offset, known);
    else this.measurePhases();
    handle.mixer.stopAllAction();
    for (const s of SLOTS) {
      const a = this.actions.get(s)!;
      a.reset();
      a.enabled = true;
      a.setEffectiveTimeScale(MOVING.includes(s as Moving) ? 0 : 1); // moving loops: time driven by the gait phase
      a.setEffectiveWeight(this.weight[s]);
      a.play();
    }
  }

  /**
   * Measures a character's foot phases ahead of time (~0.1-0.3 s of work): called while the game loads, so that
   * choosing an operator never freezes the picture. Leaves the character's mixer stopped.
   */
  static prepare(handle: CharacterHandle, stride: number) {
    if (measured.has(handle)) return;
    const l = new Locomotion(handle, stride); // measures and caches
    handle.mixer.stopAllAction();
    void l;
  }

  /**
   * Samples each moving loop and finds the normalised time at which the left foot is furthest in front of the
   * right one (normalised humanoid bones, so every character gives the same answer for the same clip).
   */
  private measurePhases() {
    const { vrm, mixer } = this.handle;
    const left = vrm.humanoid.getNormalizedBoneNode('leftFoot');
    const right = vrm.humanoid.getNormalizedBoneNode('rightFoot');
    const root = vrm.humanoid.normalizedHumanBonesRoot;
    if (!left || !right) return;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const samples = 48;
    const series = new Map<Moving, { x: number; z: number }[]>();
    mixer.stopAllAction();
    for (const m of MOVING) {
      const action = this.actions.get(m)!;
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(0).play();
      const s: { x: number; z: number }[] = [];
      for (let k = 0; k < samples; k++) {
        action.time = (k / samples) * this.duration[m];
        mixer.update(0);
        root.updateMatrixWorld(true);
        root.worldToLocal(left.getWorldPosition(a));
        root.worldToLocal(right.getWorldPosition(b));
        s.push({ x: a.x - b.x, z: a.z - b.z });
      }
      action.stop();
      series.set(m, s);
    }
    // The stride axis is the horizontal axis along which the feet separate the most (same rig for every clip).
    const walk = series.get('walk')!;
    const variance = (key: 'x' | 'z') => { const mean = walk.reduce((t, p) => t + p[key], 0) / walk.length; return walk.reduce((t, p) => t + (p[key] - mean) ** 2, 0); };
    const axis: 'x' | 'z' = variance('z') >= variance('x') ? 'z' : 'x';
    for (const m of MOVING) {
      const s = series.get(m)!;
      let best = 0;
      for (let k = 1; k < samples; k++) if (s[k][axis] > s[best][axis]) best = k;
      this.offset[m] = best / samples;
    }
    measured.set(this.handle, { ...this.offset });
  }

  /** Dominant clip (debug / tests). */
  get clipName() {
    let best: Slot = 'idle';
    for (const s of SLOTS) if (this.weight[s] > this.weight[best]) best = s;
    return CLIP[best];
  }

  get weights() {
    return { ...this.weight };
  }

  update(dt: number, input: LocomotionInput) {
    const t = this.target;
    for (const s of SLOTS) t[s] = 0;
    const v = input.speed;
    if (input.air) t.air = 1;
    else if (input.landing) t.land = 1;
    else {
      // 1D blend space anchored on the gameplay speeds; idle fades out over the first steps.
      const { walk, run, sprint } = input.anchors;
      const moving = smooth01(0.06, 0.85, v);
      t.idle = 1 - moving;
      if (v <= walk) t.walk = moving;
      else if (v <= run) { const k = (v - walk) / (run - walk); t.walk = (1 - k) * moving; t.run = k * moving; }
      else { const k = Math.min(1, (v - run) / (sprint - run)); t.run = (1 - k) * moving; t.sprint = k * moving; }
    }
    // Landing restarts its one-shot clip.
    if (input.landing && !this.wasLanding) this.actions.get('land')!.reset().play();
    this.wasLanding = input.landing;

    // Ease the weights (faster into the air and onto the ground than between gaits), then normalise.
    const rate = input.air ? 14 : this.weight.air > 0.05 ? 16 : 9;
    const k = 1 - Math.exp(-rate * dt);
    let sum = 0;
    for (const s of SLOTS) { this.weight[s] += (t[s] - this.weight[s]) * k; sum += this.weight[s]; }
    // Snap negligible weights to exactly 0: the mixer skips zero-weight actions entirely (no track evaluation).
    sum = 0;
    for (const s of SLOTS) { if (this.weight[s] < 1e-3) this.weight[s] = 0; sum += this.weight[s]; }
    for (const s of SLOTS) this.weight[s] /= sum || 1;

    // Shared gait phase: ground speed / blended stride length (stride = clip speed × clip length × body scale).
    let wSum = 0;
    let strideLen = 0;
    let natural = 0;
    for (const m of MOVING) {
      const w = this.weight[m];
      wSum += w;
      strideLen += w * UAL_SPEED[m] * this.stride * this.duration[m];
      natural += w / this.duration[m];
    }
    if (wSum > 1e-3) {
      strideLen /= wSum;
      natural /= wSum;
      // Never slower than half the clip's own cadence (very slow steps would look like slow motion).
      const rate = Math.max(v / strideLen, natural * 0.5);
      this.phase = (this.phase + Math.min(rate, natural * 1.7) * dt) % 1;
    }
    for (const s of SLOTS) {
      const a = this.actions.get(s)!;
      a.setEffectiveWeight(this.weight[s]);
      if (MOVING.includes(s as Moving)) {
        const m = s as Moving;
        a.time = ((this.phase + this.offset[m]) % 1) * this.duration[m];
      }
    }
  }
}
