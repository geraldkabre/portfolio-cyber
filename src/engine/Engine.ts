import * as THREE from 'three';
import {
  BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';

/**
 * Replaces NaN / Inf pixels (and clamps extreme HDR values) before the bloom: with mipmap blur a single invalid
 * pixel would otherwise spread over the whole frame and turn it black.
 */
class SanitizeEffect extends Effect {
  constructor() {
    super('Sanitize', `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec3 c = inputColor.rgb;
      bool bad = any(isnan(c)) || any(isinf(c)) || any(notEqual(c, c));
      outputColor = vec4(bad ? vec3(0.0) : min(c, vec3(64.0)), inputColor.a);
    }`);
  }
}
import { QUALITY, type QualityLevel, type QualityPreset } from './quality';

export type Updater = (dt: number, time: number) => void;

export interface FrameStats {
  fps: number;
  frameMs: number;
  cpuMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  renderScale: number;
}

/**
 * Rendering core: WebGL2 renderer, HDR post-processing chain (bloom, tone mapping, vignette),
 * a single render loop with ordered updaters, resize handling and quality presets.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);
  quality: QualityPreset;

  private composer!: EffectComposer;
  private bloom: BloomEffect | null = null;
  private readonly updaters: { order: number; fn: Updater }[] = [];
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private running = false;
  private frameTimes: number[] = [];
  private cpuTimes: number[] = [];
  private lastInfo = { calls: 0, triangles: 0 };
  timeScale = 1;
  /** Multiplier on the pixel ratio, driven by adaptive resolution (0.6 .. 1). */
  renderScale = 1;
  autoResolution = true;
  private adapt = { acc: 0, frames: 0, timer: 0, good: 0, cooldown: 0, hold: 0 };
  /** A render-scale change waiting for the start of the next frame. */
  private pendingResize = false;

  /** Freezes adaptive resolution for a while (scene changes: shaders compile, the first frames are slow). */
  holdResolution(seconds: number) {
    this.adapt.hold = Math.max(this.adapt.hold, seconds);
    this.adapt.acc = 0; this.adapt.frames = 0; this.adapt.timer = 0;
  }

  constructor(readonly canvas: HTMLCanvasElement, level: QualityLevel) {
    this.quality = QUALITY[level];
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // tone mapping is done by the post chain
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // static world shadows: see refreshShadows()
    this.renderer.info.autoReset = false;
    this.applyQuality(this.quality);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  get maxAnisotropy() {
    return this.renderer.capabilities.getMaxAnisotropy();
  }

  setQuality(level: QualityLevel) {
    this.applyQuality(QUALITY[level]);
  }

  /** Re-renders the static shadow map on the next frame (after building the world or changing quality). */
  refreshShadows() {
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Profiling only: overrides individual preset fields (bloom, msaa, shadows, pixel ratio). */
  override(patch: Partial<QualityPreset>) {
    this.applyQuality({ ...this.quality, ...patch });
  }

  private applyQuality(q: QualityPreset) {
    const shadowToggle = this.renderer.shadowMap.enabled !== q.shadowMapSize > 0;
    this.quality = q;
    this.renderer.shadowMap.enabled = q.shadowMapSize > 0;
    this.scene.traverse((o) => {
      const l = o as THREE.DirectionalLight;
      if (l.isDirectionalLight && l.shadow) {
        l.castShadow = q.shadowMapSize > 0;
        if (q.shadowMapSize) { l.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize); l.shadow.map?.dispose(); l.shadow.map = null as never; }
      }
      // Programs only depend on the shadow state: recompile only when shadows are switched on or off.
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (shadowToggle && m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.needsUpdate = true; });
    });
    this.buildComposer();
    this.resize();
    this.refreshShadows();
  }

  private buildComposer() {
    this.composer?.dispose();
    const q = this.quality;
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: q.msaa });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const effects = [];
    this.bloom = null;
    if (q.bloom) {
      this.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.62, luminanceSmoothing: 0.22, intensity: 1.15, radius: 0.72, levels: 6, resolutionScale: 0.5 });
      // Sanitize the bloom input: with mipmap blur one NaN/Inf pixel would otherwise spread over the whole frame.
      const lm = this.bloom.luminanceMaterial;
      const fetch = 'vec4 texel=texture2D(inputBuffer,vUv);';
      if (lm.fragmentShader.includes(fetch)) {
        lm.fragmentShader = lm.fragmentShader.replace(fetch, fetch + 'texel.rgb=(any(isnan(texel.rgb))||any(isinf(texel.rgb))||any(notEqual(texel.rgb,texel.rgb)))?vec3(0.0):min(texel.rgb,vec3(64.0));');
        lm.needsUpdate = true;
      } else {
        this.composer.addPass(new EffectPass(this.camera, new SanitizeEffect()));
      }
      effects.push(this.bloom);
    }
    effects.push(new VignetteEffect({ offset: 0.28, darkness: 0.62 }));
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.AGX }));
    if (q.msaa === 0) effects.push(new SMAAEffect());
    this.composer.addPass(new EffectPass(this.camera, ...effects));
  }

  setBloom(intensity: number, threshold?: number) {
    if (!this.bloom) return;
    this.bloom.intensity = intensity;
    if (threshold !== undefined) this.bloom.luminanceMaterial.threshold = threshold;
  }

  /** Registers a per-frame callback. Lower order runs first (input 0, simulation 10, camera 20, world fx 30). */
  onUpdate(fn: Updater, order = 10) {
    const entry = { order, fn };
    this.updaters.push(entry);
    this.updaters.sort((a, b) => a.order - b.order);
    return () => {
      const i = this.updaters.indexOf(entry);
      if (i >= 0) this.updaters.splice(i, 1);
    };
  }

  readonly resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio) * this.renderScale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Runs exactly one frame (also used by tests to step deterministically). */
  frame(now = performance.now(), fixedDt?: number) {
    const raw = fixedDt ?? (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(raw, 1 / 20) * this.timeScale;
    this.elapsed += dt;
    const t0 = performance.now();
    // Resize before rendering (resizing clears the canvas: done after a render, it showed one blank frame).
    if (this.pendingResize) { this.pendingResize = false; this.resize(); }
    for (const u of this.updaters) u.fn(dt, this.elapsed);
    this.renderer.info.reset();
    this.composer.render(dt);
    this.lastInfo = { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles };
    const cpu = performance.now() - t0;
    this.frameTimes.push(raw * 1000);
    if (this.autoResolution && raw < 0.25) this.adaptResolution(raw);
    this.cpuTimes.push(cpu);
    if (this.frameTimes.length > 120) { this.frameTimes.shift(); this.cpuTimes.shift(); }
  }

  /**
   * Adaptive resolution: if the average frame time stays above ~20 ms (under 50 fps) the render scale drops by
   * 10 % (floor 0.6); after 4 s of comfortable frames it climbs back by 5 %.
   */
  private adaptResolution(raw: number) {
    const a = this.adapt;
    // Hysteresis: each change reallocates the render targets (a visible hitch), so changes are rare and never oscillate.
    if (a.hold > 0) { a.hold = Math.max(0, a.hold - raw); return; }
    a.acc += raw * 1000; a.frames++; a.timer += raw; a.cooldown = Math.max(0, a.cooldown - raw);
    if (a.timer < 1.5) return;
    const avg = a.acc / a.frames;
    if (avg > 21 && this.renderScale > 0.6) {
      // One step straight to the scale that should reach ~60 fps (pixel cost ∝ scale²): a single reallocation of
      // the render targets instead of a staircase of hitches.
      const target = this.renderScale * Math.sqrt(16.7 / avg);
      this.renderScale = Math.max(0.6, Math.min(this.renderScale - 0.05, Math.round(target * 20) / 20));
      a.good = 0;
      a.cooldown = 12;
      this.pendingResize = true;
    } else if (avg < 13.5 && a.cooldown === 0) {
      a.good += a.timer;
      if (a.good > 8 && this.renderScale < 1) { this.renderScale = Math.min(1, +(this.renderScale + 0.05).toFixed(2)); a.good = 0; this.pendingResize = true; }
    } else a.good = 0;
    a.acc = 0; a.frames = 0; a.timer = 0;
  }

  /** Renders the scene once without advancing time (used while assets compile). */
  renderOnce() {
    this.composer.render(0);
  }

  get time() {
    return this.elapsed;
  }

  stats(): FrameStats {
    const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
    const frameMs = avg(this.frameTimes);
    return {
      fps: frameMs > 0 ? 1000 / frameMs : 0,
      renderScale: this.renderScale,
      frameMs,
      cpuMs: avg(this.cpuTimes),
      drawCalls: this.lastInfo.calls,
      triangles: this.lastInfo.triangles,
      textures: this.renderer.info.memory.textures,
      geometries: this.renderer.info.memory.geometries,
    };
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.composer.dispose();
    this.renderer.dispose();
  }
}
