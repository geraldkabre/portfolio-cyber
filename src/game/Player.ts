import * as THREE from 'three';
import type { CharacterHandle } from '../cyberverse/characters/character.js';
import { LOCOMOTION } from '../cyberverse/characters/characters.js';
import type { CollisionWorld } from '../engine/Collision';

/** Root-motion speeds of the UAL clips, measured on UAL1_Standard_RM.glb (mannequin hips at 0.9167 m). */
const UAL_SPEED = { walk: 0.975, run: 5.357, sprint: 8.25 } as const;
const UAL_HIPS = 0.9167;

export interface MoveIntent {
  x: number; // right
  y: number; // forward
  sprint: boolean;
  walk: boolean;
}

export type Gait = 'idle' | 'walk' | 'run' | 'sprint' | 'air' | 'land';

const CLIP: Record<Gait, string> = {
  idle: LOCOMOTION.idle, walk: LOCOMOTION.walk, run: LOCOMOTION.run, sprint: LOCOMOTION.sprint,
  air: LOCOMOTION.jumpLoop, land: LOCOMOTION.jumpLand,
};

const _seg = new THREE.Line3();
const _before = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();

const dampAngle = (from: number, to: number, rate: number, dt: number) => {
  let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d * (1 - Math.exp(-rate * dt));
};

/**
 * Kinematic third-person character: capsule vs static BVH, gravity, ground snapping (ramps, steps),
 * smoothed acceleration and turning, speed-matched locomotion clips (no foot sliding), jump.
 */
export class Player {
  readonly position = new THREE.Vector3();
  /** State at the previous fixed step (render interpolation). */
  private readonly prevPosition = new THREE.Vector3();
  private prevYaw = 0;
  /** Interpolated position used for rendering and the camera. */
  readonly renderPosition = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  grounded = true;
  gait: Gait = 'idle';
  readonly radius = 0.3;
  readonly height = 1.62;
  readonly config = { walk: 1.5, run: 4.3, sprint: 6.8, accel: 7.5, decel: 9.5, turn: 12, gravity: -24, jump: 6.6, snap: 0.42 };
  /** Stride scale of this character relative to the UAL mannequin. */
  readonly stride: number;
  private airTime = 0;
  private landTimer = 0;
  private jumpQueued = false;
  private fallStartY = 0;

  /**
   * @param rig container of the VRM scene: the VRM root keeps the VRM0 -> +Z rotation from VRMUtils.rotateVRM0,
   *            the controller only moves / turns this container.
   */
  constructor(readonly character: CharacterHandle, readonly rig: THREE.Object3D, private world: CollisionWorld) {
    const hips = character.vrm.humanoid.normalizedRestPose.hips?.position;
    this.stride = (hips?.[1] ?? UAL_HIPS) / UAL_HIPS;
  }

  setWorld(world: CollisionWorld) {
    this.world = world;
  }

  teleport(p: THREE.Vector3, yaw: number) {
    this.position.copy(p);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.grounded = true;
    this.airTime = 0;
    // A teleport is not a fall: no landing animation on arrival (islands sit at different heights).
    this.fallStartY = p.y;
    this.landTimer = 0;
    this.prevPosition.copy(p);
    this.prevYaw = yaw;
    this.present(1);
  }

  jump() {
    this.jumpQueued = true;
  }

  get horizontalSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Variable-step convenience (cutscenes): one simulation step + animation + presentation. */
  update(dt: number, intent: MoveIntent, cameraYaw: number) {
    this.simulate(dt, intent, cameraYaw);
    this.animate(dt);
    this.present(1);
  }

  /** One fixed physics step (the game runs it at 60 Hz, independent of the frame rate). */
  simulate(dt: number, intent: MoveIntent, cameraYaw: number) {
    this.prevPosition.copy(this.position);
    this.prevYaw = this.yaw;
    const c = this.config;
    // Camera-relative intent.
    _fwd.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    _right.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    _dir.set(0, 0, 0).addScaledVector(_right, intent.x).addScaledVector(_fwd, intent.y);
    const hasInput = _dir.lengthSq() > 1e-4;
    if (hasInput) _dir.normalize();
    const target = hasInput ? (intent.walk ? c.walk : intent.sprint ? c.sprint : c.run) : 0;

    // Smoothed horizontal acceleration (exponential approach, softer in the air).
    const hs = this.horizontalSpeed;
    let k = target > hs ? c.accel : c.decel;
    if (!this.grounded) k *= 0.3;
    const a = 1 - Math.exp(-k * dt);
    this.velocity.x += (_dir.x * target - this.velocity.x) * a;
    this.velocity.z += (_dir.z * target - this.velocity.z) * a;
    if (hasInput) this.yaw = dampAngle(this.yaw, Math.atan2(_dir.x, _dir.z), c.turn, dt);

    // Jump and gravity.
    if (this.jumpQueued && this.grounded && this.gait !== 'land') {
      this.velocity.y = c.jump;
      this.grounded = false;
      this.airTime = 0.13;
      this.fallStartY = this.position.y;
    }
    this.jumpQueued = false;
    this.velocity.y += c.gravity * dt;
    this.velocity.y = Math.max(this.velocity.y, -40);

    // Integrate + resolve collisions in sub-steps.
    const wasGrounded = this.grounded;
    this.grounded = false;
    const steps = 2;
    for (let i = 0; i < steps; i++) this.step(dt / steps);

    // Ground snapping keeps the feet on ramps and small steps when walking down.
    if (!this.grounded && wasGrounded && this.velocity.y <= 0) {
      const g = this.world.ground(this.position.x, this.position.y + 0.35, this.position.z, 0.35 + c.snap);
      if (g && g.normalY > 0.6) {
        this.position.y = g.y;
        this.grounded = true;
        this.velocity.y = 0;
      }
    }

    if (this.grounded) {
      if (this.airTime > 0.45 || this.fallStartY - this.position.y > 1.2) this.landTimer = 0.28;
      this.airTime = 0;
    } else {
      if (this.airTime === 0) this.fallStartY = this.position.y;
      this.airTime += dt;
    }
    this.landTimer = Math.max(0, this.landTimer - dt);
  }

  /** Places the rig between the last two physics states (alpha in [0, 1]): smooth at any frame rate. */
  present(alpha: number) {
    this.renderPosition.lerpVectors(this.prevPosition, this.position, alpha);
    let d = this.yaw - this.prevYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.rig.position.copy(this.renderPosition);
    this.rig.rotation.set(0, this.prevYaw + d * alpha, 0);
  }

  private step(dt: number) {
    this.position.addScaledVector(this.velocity, dt);
    const r = this.radius;
    _seg.start.set(this.position.x, this.position.y + r, this.position.z);
    _seg.end.set(this.position.x, this.position.y + this.height - r, this.position.z);
    _before.copy(_seg.start);
    this.world.collideCapsule(_seg, r);
    _delta.subVectors(_seg.start, _before);
    this.position.add(_delta);
    if (_delta.lengthSq() < 1e-12) return;
    const onGround = _delta.y > Math.abs(dt * this.velocity.y * 0.25) && _delta.y > 1e-5;
    if (onGround) {
      this.grounded = true;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }
    // Remove the velocity component pushing into the surface (slide along walls).
    _delta.normalize();
    const into = this.velocity.dot(_delta);
    if (into < 0) {
      if (onGround) this.velocity.y = Math.max(this.velocity.y, 0);
      else this.velocity.addScaledVector(_delta, -into);
    }
  }

  /** Animation state machine + mixer + spring bones (per rendered frame). */
  animate(dt: number) {
    const hs = this.horizontalSpeed;
    const g = this.gait;
    let next: Gait;
    if (!this.grounded && this.airTime > 0.12) next = 'air';
    else if (this.landTimer > 0 && hs < 2.5) next = 'land';
    else if (hs < (g === 'idle' ? 0.3 : 0.18)) next = 'idle';
    else if (hs < (g === 'walk' ? 2.7 : 2.3)) next = 'walk';
    else if (hs < (g === 'sprint' ? 5.3 : 5.8)) next = 'run';
    else next = 'sprint';

    const fade = next === 'air' ? 0.15 : g === 'air' ? 0.1 : next === 'idle' ? 0.3 : 0.22;
    if (next !== g) {
      this.gait = next;
      this.character.play(CLIP[next], { fade });
    }
    const action = this.character.current;
    if (action) {
      let ts = 1;
      if (next === 'walk') ts = hs / (UAL_SPEED.walk * this.stride);
      else if (next === 'run') ts = hs / (UAL_SPEED.run * this.stride);
      else if (next === 'sprint') ts = hs / (UAL_SPEED.sprint * this.stride);
      action.setEffectiveTimeScale(THREE.MathUtils.clamp(ts, 0.55, 1.6));
    }
    this.character.update(dt);
  }

}
