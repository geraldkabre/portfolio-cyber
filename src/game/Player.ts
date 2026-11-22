import * as THREE from 'three';
import type { CharacterHandle } from '../cyberverse/characters/character.js';
import type { CollisionWorld } from '../engine/Collision';
import { Locomotion, UAL_HIPS } from './Locomotion';

export interface MoveIntent {
  x: number; // right
  y: number; // forward
  sprint: boolean;
  walk: boolean;
}

export type Gait = 'idle' | 'walk' | 'run' | 'sprint' | 'air' | 'land';


const _seg = new THREE.Line3();
const _before = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();


/**
 * Kinematic third-person character: capsule vs static BVH, gravity, ground snapping (ramps, steps), jump.
 * Motion quality: two-stage velocity smoothing (an S-curve start and stop instead of an instant kick),
 * speed-dependent turning, a slight lean into turns and with acceleration, and a continuous, phase-synchronised
 * locomotion blend (see Locomotion.ts). Physics runs at a fixed 60 Hz; the rig is interpolated between steps.
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
  readonly config = { walk: 1.5, run: 4.3, sprint: 6.8, accel: 9, decel: 11, intent: 14, turn: 17, turnFast: 11, gravity: -24, jump: 6.6, snap: 0.42 };
  /** Stride scale of this character relative to the UAL mannequin. */
  readonly stride: number;
  private airTime = 0;
  private landTimer = 0;
  private jumpQueued = false;
  private fallStartY = 0;
  /** First smoothing stage: the velocity the controller is heading for (the input itself is a step). */
  private readonly desired = new THREE.Vector3();
  /** Angular velocity of the body (rad/s): critically damped spring towards the movement direction. */
  private yawRate = 0;
  private forwardAccel = 0;
  /** Smoothed body lean (roll into turns, pitch with acceleration), radians. */
  private lean = 0;
  private pitch = 0;
  readonly locomotion: Locomotion;
  /** Test hook: horizontal speed after every fixed physics step (null = off). */
  speedTrace: number[] | null = null;

  /**
   * @param rig container of the VRM scene: the VRM root keeps the VRM0 -> +Z rotation from VRMUtils.rotateVRM0,
   *            the controller only moves / turns this container.
   */
  constructor(readonly character: CharacterHandle, readonly rig: THREE.Object3D, private world: CollisionWorld) {
    const hips = character.vrm.humanoid.normalizedRestPose.hips?.position;
    this.stride = (hips?.[1] ?? UAL_HIPS) / UAL_HIPS;
    this.locomotion = new Locomotion(character, this.stride);
    rig.rotation.order = 'YXZ'; // yaw, then pitch / roll in the character's own frame
  }

  /** Dominant clip of the blend (debug / tests). */
  get clipName() {
    return this.locomotion.clipName;
  }

  /** Per-frame motion sample (tests): rendered position and body orientation, speed, blend weights. */
  get motion() {
    const r = this.rig.rotation;
    return {
      x: this.renderPosition.x, y: this.renderPosition.y, z: this.renderPosition.z, yaw: r.y, lean: r.z, pitch: r.x,
      speed: this.horizontalSpeed, gait: this.gait, weights: this.locomotion.weights,
    };
  }

  setWorld(world: CollisionWorld) {
    this.world = world;
  }

  teleport(p: THREE.Vector3, yaw: number) {
    this.position.copy(p);
    this.velocity.set(0, 0, 0);
    this.desired.set(0, 0, 0);
    this.yawRate = 0;
    this.forwardAccel = 0;
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

    // Two-stage smoothing: the input steers a desired velocity, the body follows it. The acceleration therefore
    // ramps up and down (S-curve) instead of jumping to its maximum on the first frame. Softer in the air.
    const hs = this.horizontalSpeed;
    const air = this.grounded ? 1 : 0.3;
    const ki = 1 - Math.exp(-c.intent * air * dt);
    this.desired.x += (_dir.x * target - this.desired.x) * ki;
    this.desired.z += (_dir.z * target - this.desired.z) * ki;
    const desiredSpeed = Math.hypot(this.desired.x, this.desired.z);
    const k = (desiredSpeed > hs ? c.accel : c.decel) * air;
    const a = 1 - Math.exp(-k * dt);
    const vx0 = this.velocity.x, vz0 = this.velocity.z;
    this.velocity.x += (this.desired.x - this.velocity.x) * a;
    this.velocity.z += (this.desired.z - this.velocity.z) * a;
    // Forward acceleration along the facing direction (for the lean).
    this.forwardAccel = ((this.velocity.x - vx0) * Math.sin(this.yaw) + (this.velocity.z - vz0) * Math.cos(this.yaw)) / dt;
    // Turning: a critically damped spring (no instant kick, no overshoot) — quick at walking pace, wider arcs at
    // full speed, lazy in the air. Without input the body settles where it is.
    const turn = THREE.MathUtils.lerp(c.turn, c.turnFast, THREE.MathUtils.clamp((hs - c.walk) / (c.sprint - c.walk), 0, 1)) * (this.grounded ? 1 : 0.4);
    let err = 0;
    if (hasInput) {
      err = Math.atan2(_dir.x, _dir.z) - this.yaw;
      err = Math.atan2(Math.sin(err), Math.cos(err));
    }
    this.yawRate += (turn * turn * err - 2 * turn * this.yawRate) * dt;
    this.yaw += this.yawRate * dt;
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));

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
    if (this.speedTrace && this.speedTrace.length < 2000) this.speedTrace.push(this.horizontalSpeed);
  }

  /** Places the rig between the last two physics states (alpha in [0, 1]): smooth at any frame rate. */
  present(alpha: number) {
    this.renderPosition.lerpVectors(this.prevPosition, this.position, alpha);
    let d = this.yaw - this.prevYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.rig.position.copy(this.renderPosition);
    this.rig.rotation.set(this.pitch, this.prevYaw + d * alpha, this.lean);
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

  /** Locomotion blend + body lean + mixer + spring bones (per rendered frame). */
  animate(dt: number) {
    const hs = this.horizontalSpeed;
    const g = this.gait;
    const air = !this.grounded && this.airTime > 0.12;
    const landing = !air && this.landTimer > 0 && hs < 2.5;
    // Gait label (HUD, sounds, tests); the animation itself is a continuous blend.
    let next: Gait;
    if (air) next = 'air';
    else if (landing) next = 'land';
    else if (hs < (g === 'idle' ? 0.3 : 0.18)) next = 'idle';
    else if (hs < (g === 'walk' ? 2.7 : 2.3)) next = 'walk';
    else if (hs < (g === 'sprint' ? 5.3 : 5.8)) next = 'run';
    else next = 'sprint';
    this.gait = next;
    const c = this.config;
    this.locomotion.update(dt, { speed: hs, air, landing, anchors: { walk: c.walk, run: c.run, sprint: c.sprint } });

    // Lean into turns (centripetal, scaled down and capped at ~8 degrees) and slightly forward when accelerating.
    const k = 1 - Math.exp(-7 * dt);
    const targetLean = this.grounded ? THREE.MathUtils.clamp(-this.yawRate * hs * 0.022, -0.14, 0.14) : 0;
    const targetPitch = this.grounded ? THREE.MathUtils.clamp(this.forwardAccel * 0.006, -0.05, 0.07) : 0;
    this.lean += (targetLean - this.lean) * k;
    this.pitch += (targetPitch - this.pitch) * k;
    this.character.update(dt);
  }

}
