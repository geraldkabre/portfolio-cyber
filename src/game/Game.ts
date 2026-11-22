import * as THREE from 'three';
import { Engine } from '../engine/Engine';
import { Input } from '../engine/Input';
import { prefersReducedMotion, type QualityLevel } from '../engine/quality';
import { NexusWorld } from '../world/NexusWorld';
import { CHARACTERS, CLIPS_URL, LOCOMOTION } from '../cyberverse/characters/characters.js';
import { loadCharacter, loadClipData, type CharacterHandle } from '../cyberverse/characters/character.js';
import { Player } from './Player';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { store, type OperatorId, type PanelId } from '../app/store';
import { LAYOUT } from '../world/layout';
import { PALETTE } from '../world/palette';
import { beamMaterial, ringMaterial } from '../world/fx';
import { DISTRICTS } from '../content/profile';
import { ambient } from '../audio/AmbientMusic';

/** Fixed physics step: movement is simulated at 60 Hz and interpolated for display (smooth at any frame rate). */
const STEP = 1 / 60;
const _probe = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _local = new THREE.Vector3();

const STAGE = {
  female: new THREE.Vector3(-1.3, 0, LAYOUT.spawn.z),
  male: new THREE.Vector3(1.3, 0, LAYOUT.spawn.z),
  camera: new THREE.Vector3(0, 1.45, LAYOUT.spawn.z + 5.3),
  look: new THREE.Vector3(0, 1.05, LAYOUT.spawn.z),
};

/** Soft contact shadow under the operator (characters do not render into the static shadow map). */
function createContactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  }));
  m.renderOrder = 1;
  m.name = 'contact-shadow';
  return m;
}

const STAGE_KEY = 24;
const PLAYER_FILL = 5;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Game orchestrator: loading, operator selection, the transition into third-person play,
 * per-frame simulation (player, camera, world, interactions, portals, doors) and the UI bridge.
 */
export class Game {
  readonly engine: Engine;
  readonly input: Input;
  world!: NexusWorld;
  private characters = new Map<OperatorId, CharacterHandle>();
  /** One container per operator (the VRM root inside keeps its own VRM0 rotation). */
  private rigs = new Map<OperatorId, THREE.Group>();
  private player: Player | null = null;
  private cam: ThirdPersonCamera | null = null;
  private stageFx = new THREE.Group();
  /**
   * One light for both phases: key light on the two operators during selection, then a soft fill that follows
   * the player. The scene light count never changes after loading (a change would recompile every shader).
   */
  private keyLight = new THREE.PointLight('#cfe3ff', 0, 14, 2);
  private contactShadow = createContactShadow();
  private transition: { t: number; from: THREE.Vector3; fromLook: THREE.Vector3 } | null = null;
  private teleporting: { t: number; target: string; from: string; surge?: { value: number }; done: boolean } | null = null;
  private accumulator = 0;
  private doorWasOpen = false;
  private dissolve: { t: number; id: OperatorId } | null = null;
  private lookAtCurrent = STAGE.look.clone();
  private reducedMotion = prefersReducedMotion();
  private statsTimer = 0;
  private disposed = false;

  private constructor(readonly canvas: HTMLCanvasElement, quality: QualityLevel) {
    this.engine = new Engine(canvas, quality);
    this.input = new Input(canvas);
    store.set({ quality });
  }

  static async start(canvas: HTMLCanvasElement, quality: QualityLevel) {
    const game = new Game(canvas, quality);
    await game.load();
    return game;
  }

  private async load() {
    store.set({ phase: 'loading', progress: 0, progressLabel: 'Establishing secure uplink' });
    const parts = { world: 0, clips: 0, female: 0, male: 0 };
    const weights = { world: 0.35, clips: 0.1, female: 0.275, male: 0.275 };
    const report = (label: string) => {
      const p = Object.entries(parts).reduce((s, [k, v]) => s + v * weights[k as keyof typeof weights], 0);
      store.set({ progress: Math.min(0.99, p), progressLabel: label });
    };
    const progress = (key: keyof typeof parts, label: string) => (e: ProgressEvent) => {
      if (e.total) { parts[key] = e.loaded / e.total; report(label); }
    };
    const [world, clips] = await Promise.all([
      NexusWorld.create(this.engine, (p, label) => { parts.world = p; report(label === 'Environment' ? 'Building Nexus Prime' : label); }),
      loadClipData(CLIPS_URL).then((c) => { parts.clips = 1; report('Motion library'); return c; }),
    ]);
    this.world = world;
    const only = Object.values(LOCOMOTION).concat(['Idle_Talking_Loop', 'Interact']);
    const [female, male] = await Promise.all([
      loadCharacter(CHARACTERS.female.url, clips, { onProgress: progress('female', 'Operator NEON FIGHTER +'), clips: only }),
      loadCharacter(CHARACTERS.male.url, clips, { onProgress: progress('male', 'Operator CYBER JT'), clips: only }),
    ]);
    this.characters.set('female', female);
    this.characters.set('male', male);
    this.stage();
    report('Compiling shaders');
    await this.engine.renderer.compileAsync(this.engine.scene, this.engine.camera);
    this.engine.onUpdate((dt, t) => this.tick(dt, t), 10);
    this.bindInput();
    this.engine.start();
    store.set({ phase: 'select', progress: 1, progressLabel: 'Ready' });
    this.exposeDebug();
  }

  // ---------------------------------------------------------------- selection
  private stage() {
    const scene = this.engine.scene;
    for (const id of ['female', 'male'] as const) {
      const ch = this.characters.get(id)!;
      const rig = new THREE.Group();
      rig.name = `rig-${id}`;
      rig.add(ch.root);
      rig.position.copy(STAGE[id]);
      rig.rotation.set(0, 0, 0); // operators face +Z (south), toward the selection camera
      ch.play(LOCOMOTION.idle, { fade: 0 });
      ch.root.traverse((o) => { o.castShadow = false; }); // contact shadow instead of the (static) shadow map
      scene.add(rig);
      this.rigs.set(id, rig);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 96), ringMaterial(PALETTE.cyan, 2.0, 36, 0.12));
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(STAGE[id]).setY(0.045);
      ring.name = `ring-${id}`;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 3.2, 32, 1, true).translate(0, 1.6, 0), beamMaterial(PALETTE.cyan, 0.35));
      beam.position.copy(STAGE[id]);
      beam.name = `beam-${id}`;
      this.stageFx.add(ring, beam);
    }
    scene.add(this.stageFx);
    this.keyLight.position.set(0, 2.6, LAYOUT.spawn.z + 3.3);
    this.keyLight.intensity = STAGE_KEY;
    // The contact shadow is created now (hidden) so its shader is compiled with everything else.
    (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0;
    scene.add(this.keyLight, this.contactShadow);
    const cam = this.engine.camera;
    cam.fov = 38;
    cam.updateProjectionMatrix();
    cam.position.copy(STAGE.camera);
    cam.lookAt(STAGE.look);
  }

  hover(id: OperatorId) {
    if (store.get().phase !== 'select') return;
    store.set({ hovered: id });
  }

  confirm(id: OperatorId = store.get().hovered) {
    if (store.get().phase !== 'select') return;
    store.set({ selected: id, hovered: id, phase: 'entering' });
    const other: OperatorId = id === 'female' ? 'male' : 'female';
    this.dissolve = { t: 0, id: other };
    const ch = this.characters.get(id)!;
    this.player = new Player(ch, this.rigs.get(id)!, this.world.collision);
    this.player.teleport(STAGE[id].clone(), 0);
    this.cam = new ThirdPersonCamera(this.engine.camera, this.world.collision);
    this.cam.yaw = 0; // behind the character, looking north toward the Command Center
    this.transition = { t: 0, from: this.engine.camera.position.clone(), fromLook: this.lookAtCurrent.clone() };
  }

  // ---------------------------------------------------------------- frame
  private tick(dt: number, t: number) {
    const phase = store.get().phase;
    const cam = this.engine.camera;
    if (phase === 'select') this.tickSelect(dt, t);
    if (this.dissolve) this.tickDissolve(dt);
    if (phase === 'entering' && this.transition && this.player && this.cam) this.tickEnter(dt);
    if (phase === 'play' && this.player && this.cam) this.tickPlay(dt);
    if (this.player) {
      const p = this.player.renderPosition;
      const g = this.world.collision.ground(p.x, p.y + 0.4, p.z, 6);
      const height = g ? p.y - g.y : 6;
      this.contactShadow.position.set(p.x, (g?.y ?? p.y) + 0.02, p.z);
      this.contactShadow.scale.setScalar(1 + height * 0.25);
      (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(0.75 - height * 0.25, 0, 0.75);
      if (store.get().phase === 'play') this.keyLight.position.copy(this.player.renderPosition).add(_offset.set(Math.sin(this.cam!.yaw) * 1.6, 2.4, Math.cos(this.cam!.yaw) * 1.6));
    }
    if (this.player && store.get().phase === 'play') this.world.focus.copy(this.player.renderPosition);
    this.world.update(dt, t, cam);
    this.statsTimer += dt;
    if (this.statsTimer > 0.5) {
      this.statsTimer = 0;
      const s = this.engine.stats();
      store.set({ fps: Math.round(s.fps), frameMs: Math.round(s.frameMs * 10) / 10, drawCalls: s.drawCalls });
    }
  }

  private tickSelect(dt: number, t: number) {
    const hovered = store.get().hovered;
    for (const [id, ch] of this.characters) {
      ch.update(dt);
      const on = id === hovered;
      const beam = this.stageFx.getObjectByName(`beam-${id}`) as THREE.Mesh;
      const ring = this.stageFx.getObjectByName(`ring-${id}`) as THREE.Mesh;
      const k = 1 - Math.exp(-8 * dt);
      beam.scale.y += ((on ? 1 : 0.35) - beam.scale.y) * k;
      ring.scale.setScalar(ring.scale.x + ((on ? 1.08 : 0.9) - ring.scale.x) * k);
    }
    const focus = STAGE[hovered];
    const drift = this.reducedMotion ? 0 : Math.sin(t * 0.3) * 0.12;
    const targetCam = STAGE.camera.clone().add(new THREE.Vector3(focus.x * 0.32 + drift, 0, 0));
    const targetLook = STAGE.look.clone().add(new THREE.Vector3(focus.x * 0.55, 0, 0));
    const k = 1 - Math.exp(-3 * dt);
    this.engine.camera.position.lerp(targetCam, k);
    this.lookAtCurrent.lerp(targetLook, k);
    this.engine.camera.lookAt(this.lookAtCurrent);
  }

  private tickDissolve(dt: number) {
    const d = this.dissolve!;
    d.t += dt / (this.reducedMotion ? 0.2 : 0.9);
    const ch = this.characters.get(d.id)!;
    const rig = this.rigs.get(d.id)!;
    ch.update(dt);
    const beam = this.stageFx.getObjectByName(`beam-${d.id}`) as THREE.Mesh;
    beam.scale.set(1 + d.t * 0.4, 1 + d.t * 2.5, 1 + d.t * 0.4);
    const s = Math.max(0.001, 1 - easeInOut(Math.min(1, d.t)));
    rig.scale.set(s, 1 + (1 - s) * 0.6, s);
    if (d.t >= 1) {
      this.engine.scene.remove(rig);
      ch.dispose();
      this.characters.delete(d.id);
      this.rigs.delete(d.id);
      this.stageFx.remove(beam, this.stageFx.getObjectByName(`ring-${d.id}`)!);
      this.dissolve = null;
    }
  }

  private tickEnter(dt: number) {
    const tr = this.transition!;
    const player = this.player!, cam = this.cam!;
    tr.t += dt / (this.reducedMotion ? 0.3 : 1.7);
    const e = easeInOut(Math.min(1, tr.t));
    // The operator turns toward the Command Center while the camera swings behind it.
    player.yaw = Math.PI * Math.min(1, e * 1.2);
    player.update(dt, { x: 0, y: 0, sprint: false, walk: false }, cam.yaw);
    cam.yaw = 0;
    const camera = this.engine.camera;
    const behind = new THREE.Vector3(0, 0, 0);
    const pitch = cam.pitch;
    behind.set(Math.sin(cam.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(cam.yaw) * Math.cos(pitch)).multiplyScalar(cam.distance);
    const focus = player.position.clone().setY(player.position.y + cam.focusHeight);
    const endPos = focus.clone().add(behind);
    camera.position.lerpVectors(tr.from, endPos, e);
    this.lookAtCurrent.lerpVectors(tr.fromLook, focus, e);
    camera.lookAt(this.lookAtCurrent);
    camera.fov = 38 + (55 - 38) * e;
    camera.updateProjectionMatrix();
    this.keyLight.intensity = STAGE_KEY + (PLAYER_FILL - STAGE_KEY) * e;
    if (tr.t >= 1) {
      this.transition = null;
      const ring = this.stageFx.getObjectByName(`ring-${store.get().selected}`);
      const beam = this.stageFx.getObjectByName(`beam-${store.get().selected}`);
      if (ring) this.stageFx.remove(ring);
      if (beam) this.stageFx.remove(beam);
      cam.snapBehind(player.position, player.yaw);
      this.input.enabled = true;
      store.set({ phase: 'play' });
    }
  }

  private tickPlay(dt: number) {
    const player = this.player!, cam = this.cam!;
    const ui = store.get();
    const locked = ui.panel !== null || this.teleporting !== null;
    this.input.enabled = !locked;
    const look = this.input.consumeLook();
    if (!locked) cam.look(look.x, look.y);
    const wheel = this.input.consumeWheel();
    if (wheel) cam.zoom(wheel);
    const move = this.input.moveVector();
    const intent = { x: move.x, y: move.y, sprint: this.input.sprint, walk: ui.walkMode || this.input.touchWalk };
    // Fixed-step simulation + interpolation (no jitter when the frame time varies).
    this.accumulator = Math.min(this.accumulator + dt, STEP * 5);
    while (this.accumulator >= STEP) {
      player.simulate(STEP, intent, cam.yaw);
      this.accumulator -= STEP;
    }
    player.present(this.accumulator / STEP);
    player.animate(dt);
    if (player.position.y < -60) this.respawn();
    // Keyboard-only players: the camera lazily swings behind the operator when it moves forward and the mouse rests.
    if (performance.now() - this.input.lastLookAt > 1200 && !this.input.pointerLocked) {
      cam.follow(player.yaw, Math.max(0, move.y) * Math.min(1, player.horizontalSpeed / 3), dt);
    }
    cam.update(dt, player.renderPosition);

    const p = player.position;
    const onNexus = this.world.active === 'command';
    // Command Center gate opens when the operator approaches (or is inside).
    const inHall = onNexus && Math.hypot(p.x, p.z) < LAYOUT.cc.inradius;
    const open = onNexus && (p.distanceTo(this.world.cc.gatePosition) < 7.5 || inHall);
    this.world.cc.setDoorWanted(open);
    if (open !== this.doorWasOpen) { this.doorWasOpen = open; ambient.sfxPlay('door'); }

    // Portals (trigger volume in each portal's local frame).
    if (!this.teleporting) {
      _probe.set(p.x, p.y + 0.9, p.z);
      for (const portal of this.world.portals) {
        const l = _local.copy(_probe).applyMatrix4(portal.inverse);
        if (Math.abs(l.x) < 1.75 && Math.abs(l.z) < 0.5 && l.y > -0.5 && l.y < 4) {
          this.startTeleport(portal.to, portal.uniforms.uSurge);
          break;
        }
      }
    } else this.tickTeleport(dt);

    // Interaction prompt + location.
    let prompt: string | null = null;
    for (const it of this.world.interactables) {
      if (Math.hypot(it.position.x - p.x, it.position.z - p.z) < it.radius && Math.abs(it.position.y - p.y) < 2.5) { prompt = it.prompt; break; }
    }
    const here = DISTRICTS.find((d) => d.id === this.world.active)!;
    const location = onNexus ? (inHall ? 'COMMAND CENTER  ·  OPERATIONS HALL' : 'NEXUS PRIME  ·  PLAZA') : here.name.toUpperCase();
    store.set({ prompt: ui.panel ? null : prompt, location, district: this.world.active, pointerLocked: this.input.pointerLocked });
  }

  /** Portal or map travel: flash, swap the active island at mid-flash, place the operator, fade back. */
  private startTeleport(target: string, surge?: { value: number }) {
    if (this.teleporting) return;
    this.teleporting = { t: 0, target, from: this.world.active, surge, done: false };
    store.set({ flash: 1 });
    ambient.sfxPlay(surge ? 'portal' : 'travel');
  }

  /** Fast travel from the campus map (or the debug API). */
  travel(id: string) {
    if (store.get().phase !== 'play') return;
    this.closePanel();
    this.startTeleport(id);
  }

  private tickTeleport(dt: number) {
    const tp = this.teleporting!;
    tp.t += dt;
    if (tp.surge) tp.surge.value = Math.max(0, 1 - tp.t * 2);
    if (!tp.done && tp.t > (this.reducedMotion ? 0.05 : 0.32)) {
      tp.done = true;
      const to = this.world.arrival(tp.target, tp.from);
      this.world.setActive(tp.target);
      this.player!.teleport(to.position, to.yaw);
      this.accumulator = 0;
      if (!this.reducedMotion) this.cam!.arrive(); // establishing pull-in on the new island
      this.cam!.snapBehind(to.position, to.yaw);
      store.set({ flash: 0, district: tp.target });
    }
    if (tp.t > 0.9) this.teleporting = null;
  }

  private respawn() {
    const s = this.world.spawn;
    this.player!.teleport(s.position, s.yaw);
    this.cam!.snapBehind(s.position, s.yaw);
  }

  // ---------------------------------------------------------------- UI bridge
  private bindInput() {
    this.input.on('interact', () => this.interact());
    this.input.on('jump', () => this.jump());
    this.input.on('toggleWalk', () => { if (store.get().phase === 'play') store.set({ walkMode: !store.get().walkMode }); });
    this.input.on('escape', () => { if (store.get().panel) this.closePanel(); });
    this.input.on('help', () => { if (store.get().phase === 'play') this.openPanel(store.get().panel === 'help' ? null : 'help'); });
    this.input.on('debug', () => store.set({ debug: !store.get().debug }));
    this.input.on('map', () => { if (store.get().phase === 'play') this.openPanel(store.get().panel === 'map' ? null : 'map'); });
    // The music starts with the first interaction when the page was opened through a deep link.
    const kick = () => { if (ambient.settings.music && !ambient.running) ambient.start(); };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    window.addEventListener('keydown', (e) => {
      if (store.get().phase !== 'select') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.hover('female');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.hover('male');
    });
    document.addEventListener('pointerlockchange', () => store.set({ pointerLocked: this.input.pointerLocked }));
  }

  /** E key / touch button: confirm the operator, or open the terminal in reach. */
  interact() {
    const ui = store.get();
    if (ui.phase === 'select') { this.confirm(); return; }
    if (ui.phase !== 'play' || ui.panel) return;
    const p = this.player!.position;
    const it = this.world.interactables.find((i) => Math.hypot(i.position.x - p.x, i.position.z - p.z) < i.radius && Math.abs(i.position.y - p.y) < 2.5);
    if (it) this.openPanel(it.panel);
  }

  jump() {
    if (store.get().phase === 'play' && !store.get().panel) this.player?.jump();
  }

  /** Touch controls (virtual stick, camera drag, sprint toggle). */
  touch(move: { x: number; y: number } | null, look?: { dx: number; dy: number }, sprint?: boolean) {
    if (move) { this.input.touchMove.x = move.x; this.input.touchMove.y = move.y; }
    if (look) this.input.touchLook(look.dx, look.dy);
    if (sprint !== undefined) this.input.touchSprint = sprint;
  }

  openPanel(panel: PanelId) {
    if (!panel) { this.closePanel(); return; }
    this.input.exitPointerLock();
    if (store.get().panel !== panel) ambient.sfxPlay('open');
    store.set({ panel, prompt: null });
  }

  closePanel() {
    store.set({ panel: null });
  }

  setQuality(level: QualityLevel) {
    this.engine.setQuality(level);
    store.set({ quality: level });
    try { localStorage.setItem('cv.quality', level); } catch { /* storage unavailable */ }
  }

  // ---------------------------------------------------------------- test / debug hooks
  private exposeDebug() {
    const w = window as unknown as { __cv?: unknown };
    w.__cv = {
      state: () => {
        const p = this.player;
        return {
          phase: store.get().phase, panel: store.get().panel, prompt: store.get().prompt, location: store.get().location,
          position: p ? p.position.toArray().map((v) => +v.toFixed(3)) : null,
          yaw: p ? +p.yaw.toFixed(3) : null, gait: p?.gait ?? null, grounded: p?.grounded ?? null,
          speed: p ? +p.horizontalSpeed.toFixed(3) : null, clip: p?.clipName ?? null,
          camYaw: this.cam ? +this.cam.yaw.toFixed(3) : null, camPitch: this.cam ? +this.cam.pitch.toFixed(3) : null,
          camPos: this.engine.camera.position.toArray().map((v) => +v.toFixed(2)),
          door: +this.world.cc.doorOpen.toFixed(2), stats: this.engine.stats(), world: this.world.stats,
          gl: this.engine.renderer.info.memory,
        };
      },
      hover: (id: OperatorId) => this.hover(id),
      confirm: (id?: OperatorId) => this.confirm(id),
      look: (dx: number, dy: number) => this.input.injectLook(dx, dy),
      teleport: (x: number, y: number, z: number, yaw = 0) => {
        if (!this.player || !this.cam) return;
        this.player.teleport(new THREE.Vector3(x, y, z), yaw);
        this.cam.snapBehind(this.player.position, yaw);
      },
      setCamera: (yaw: number, pitch: number, distance?: number) => {
        if (!this.cam) return;
        this.cam.yaw = yaw; this.cam.pitch = pitch; if (distance) this.cam.distance = distance;
      },
      openPanel: (p: PanelId) => this.openPanel(p),
      travel: (id: string) => this.travel(id),
      active: () => this.world.active,
      motion: () => (this.player ? { t: performance.now(), ...this.player.motion } : null),
      speedTrace: (on: boolean) => { if (!this.player) return null; const tr = this.player.speedTrace; this.player.speedTrace = on ? [] : null; return tr; },
      terminals: () => this.world.interactables.map((i) => ({ id: i.id, panel: i.panel, position: i.position.toArray().map((v) => +v.toFixed(2)) })),
      portals: () => this.world.portals.map((q) => ({ id: q.id, to: q.to })),
      // Profiling toggles.
      show: (name: string, visible: boolean) => {
        const o = this.engine.scene.getObjectByName(name);
        if (o) o.visible = visible;
        return !!o;
      },
      motes: (visible: boolean) => { this.engine.scene.traverse((o) => { if ((o as THREE.Points).isPoints) o.visible = visible; }); },
      pointLights: (on: boolean) => { this.engine.scene.traverse((o) => { if ((o as THREE.PointLight).isPointLight) o.visible = on; }); },
      override: (patch: Record<string, unknown>) => this.engine.override(patch),
      quality: (level: QualityLevel) => this.setQuality(level),
      autoRes: (on: boolean) => { this.engine.autoResolution = on; if (!on) { this.engine.renderScale = 1; this.engine.resize(); } },
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.input.dispose();
    this.engine.dispose();
  }
}
