import * as THREE from 'three';
import type { CollisionWorld } from '../engine/Collision';

const _target = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _focus = new THREE.Vector3();

/**
 * Orbit camera behind the character: mouse yaw/pitch, wheel zoom, smoothed follow,
 * and collision (the camera is pulled in front of any wall between it and the character).
 */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = 0.26;
  distance = 4.1;
  readonly minDistance = 2.2;
  readonly maxDistance = 8;
  private current = 4.1;
  private readonly smoothed = new THREE.Vector3();
  private initialized = false;
  /** Height of the look-at point above the feet. */
  focusHeight = 1.45;
  shoulder = 0.28;
  /** Establishing offset after a teleport (eased out): wider and higher, then settles behind the operator. */
  private intro = { t: 0, dur: 0 };

  constructor(readonly camera: THREE.PerspectiveCamera, private world: CollisionWorld) {}

  setWorld(world: CollisionWorld) {
    this.world = world;
  }

  /** Places the camera behind a facing direction immediately (spawn, teleport). */
  snapBehind(feet: THREE.Vector3, facingYaw: number) {
    this.yaw = facingYaw + Math.PI;
    this.smoothed.copy(feet).setY(feet.y + this.focusHeight);
    this.current = this.distance + 3.4 * this.introAmount;
    this.initialized = true;
    this.apply(1);
  }

  /** Starts a short pull-in from a wider, higher framing (arrival on an island). */
  arrive(duration = 1.6) {
    this.intro.t = 0;
    this.intro.dur = duration;
  }

  /** 1 at the start of an arrival, 0 once settled (ease-out cubic). */
  private get introAmount() {
    const i = this.intro;
    if (i.dur <= 0 || i.t >= i.dur) return 0;
    const u = i.t / i.dur;
    return Math.pow(1 - u, 3);
  }

  look(dx: number, dy: number) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy, -0.32, 1.12);
  }

  /**
   * Lazily swings the camera behind the character while it moves forward without mouse input
   * (keyboard-only players keep a natural view; any mouse movement takes priority).
   */
  follow(characterYaw: number, strength: number, dt: number) {
    if (strength <= 0) return;
    const target = characterYaw + Math.PI;
    const d = Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw));
    this.yaw += d * (1 - Math.exp(-1.6 * strength * dt));
  }

  zoom(steps: number) {
    this.distance = THREE.MathUtils.clamp(this.distance * (1 + steps * 0.12), this.minDistance, this.maxDistance);
  }

  update(dt: number, feet: THREE.Vector3) {
    _target.copy(feet).setY(feet.y + this.focusHeight);
    if (!this.initialized) { this.smoothed.copy(_target); this.initialized = true; }
    // Horizontal follow is tight, vertical follow softer (stairs, jumps).
    // The target is already interpolated (fixed-step physics): follow it tightly, soften only the vertical.
    const kh = 1 - Math.exp(-30 * dt), kv = 1 - Math.exp(-9 * dt);
    this.smoothed.x += (_target.x - this.smoothed.x) * kh;
    this.smoothed.z += (_target.z - this.smoothed.z) * kh;
    this.smoothed.y += (_target.y - this.smoothed.y) * kv;
    if (this.intro.t < this.intro.dur) this.intro.t += dt;
    this.apply(dt);
  }

  private apply(dt: number) {
    const k = this.introAmount;
    const pitch = Math.min(1.12, this.pitch + 0.3 * k);
    const distance = this.distance + 3.4 * k;
    const cp = Math.cos(pitch);
    _dir.set(Math.sin(this.yaw) * cp, Math.sin(pitch), Math.cos(this.yaw) * cp);
    // Shoulder offset (to the right of the view direction).
    const focus = _focus.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(this.shoulder).add(this.smoothed);
    // Collision: cast from the focus point toward the desired camera position.
    const hit = this.world.raycast(focus, _dir, distance + 0.3);
    const allowed = hit !== null ? Math.max(0.55, hit - 0.3) : distance;
    // Pull in immediately, ease back out.
    if (allowed < this.current) this.current = allowed;
    else this.current += (allowed - this.current) * (1 - Math.exp(-4 * dt));
    _desired.copy(focus).addScaledVector(_dir, this.current);
    this.camera.position.copy(_desired);
    this.camera.lookAt(focus);
  }

  /** Horizontal forward direction of the view (for camera-relative movement). */
  get viewYaw() {
    return this.yaw;
  }
}
