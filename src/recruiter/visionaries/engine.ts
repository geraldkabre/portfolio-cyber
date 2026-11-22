/**
 * Visionaries — interaction and motion engine (docs/cyberverse/pantheon.md §4–§15).
 *
 * Ownership: one frame callback (on GSAP's single requestAnimationFrame ticker) owns every per-frame write — the
 * carousel position tween, the nine disc transforms, the backdrop cross-fade, the glow and the glass wobble. GSAP
 * only tweens progress values (`enter`) and the backdrop wrapper (`.vis-bgwrap`), which the frame loop never
 * touches. React re-renders only when the focal scene changes.
 */
import gsap from 'gsap';
import { whenSmooth } from '../../content/WorldContent';
import { GlassFilter, detectGlassMode, type GlassMode } from './glass';
import {
  VIS, backdropOpacity, clamp, discState, easeInOutCubic, easeOutCubic, focalIndex, layout, smoothstep, wobble, wrapOff,
  type DiscState, type RingLayout,
} from './geometry';
import type { Scene } from './scenes';

export interface EngineCallbacks {
  /** The scene at the top changed (byUser: caused by an input, so it may be announced). */
  onFocal(index: number, byUser: boolean): void;
  /** The entrance reached the moment the title rises in. */
  onReveal(): void;
  /** The focal disc was tapped: open its section. */
  onOpen(index: number): void;
}

interface Tween {
  from: number;
  to: number;
  start: number;
  dur: number;
  /** 'step' (reader) and 'auto' start from rest; 'hermite' keeps the current velocity (re-target, flick). */
  kind: 'step' | 'auto' | 'hermite';
  v0: number;
}

interface Drag {
  id: number;
  x0: number;
  pos0: number;
  downIndex: number | null;
  moved: boolean;
  lastPos: number;
  lastT: number;
  /** Slots per 1/60 s (smoothed). */
  vel: number;
}

/** The live engine (one stage per page), for the world pages that open from it. */
export const visionaries: { engine: VisionariesEngine | null } = { engine: null };

const h10 = (u: number) => u * u * u - 2 * u * u + u;
const h01 = (u: number) => -2 * u * u * u + 3 * u * u;

export class VisionariesEngine {
  pos: number = VIS.INITIAL;
  /** Entrance progress values, tweened by GSAP and read by the frame loop. */
  readonly st = { enter: 0 };
  readonly glassMode: GlassMode;
  glassReason = 'user agent';
  entranceDone = false;
  /** performance.now() when the entrance timeline was created (tests measure the settle time from it). */
  entranceStart = 0;
  /** Test hook: freezes the wobble multiplier (1 = rest, 0 = no displacement); null = live wobble. */
  wobbleOverride: number | null = null;
  L: RingLayout;

  private readonly root: HTMLElement;
  private readonly bgwrap: HTMLElement;
  private readonly bgs: HTMLElement[];
  private readonly meds: HTMLElement[];
  private readonly imgs: HTMLImageElement[];
  private readonly rims: HTMLElement[];
  private readonly glow: HTMLElement;
  private readonly glass: GlassFilter | null;
  private readonly reduced: boolean;
  private readonly cache = { t: [] as string[], o: [] as string[], f: [] as string[], r: [] as string[], z: [] as string[], v: [] as string[], bg: [] as string[], lens: [] as string[], glow: '' };
  private readonly ds: DiscState = { off: 0, bx: 0, by: 0, topness: 0, scale: 0, lift: 0, z: 0, le: 0 };
  private tween: Tween | null = null;
  private drag: Drag | null = null;
  private focal: number = VIS.INITIAL;
  private lastInput = -Infinity;
  private lastAdvance = 0;
  private hovered = false;
  /** Focus inside the stage came from the keyboard (Tab), not from a mouse click on a chevron. */
  private focusByKeyboard = false;
  private lastPointerDown = -Infinity;
  private lastKeyDown = -Infinity;
  private inView = true;
  private ticking = false;
  private loaded = new Set<number>();
  private wheel = { acc: 0, lastTime: -Infinity, lastMag: 0, locked: false, peaked: false };
  private perf = { frames: 0, sum: 0, last: 0 };
  private timeline: gsap.core.Timeline | null = null;
  private cancelSmooth: (() => void) | null = null;
  private cleanups: Array<() => void> = [];
  private bakeTimer = 0;
  private autoTimer = 0;
  private destroyed = false;
  /** A world page covers the stage: no frame loop, no input, no auto-rotation. */
  private suspended = false;

  constructor(root: HTMLElement, private readonly scenes: Scene[], private readonly cb: EngineCallbacks) {
    this.root = root;
    this.bgwrap = root.querySelector('.vis-bgwrap')!;
    this.bgs = [...root.querySelectorAll<HTMLElement>('.vis-bg')];
    this.meds = [...root.querySelectorAll<HTMLElement>('.vis-med')];
    this.imgs = [...root.querySelectorAll<HTMLImageElement>('.vis-med-img')];
    this.rims = [...root.querySelectorAll<HTMLElement>('.vis-med-rim')];
    this.glow = root.querySelector('.vis-glow')!;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.glassMode = detectGlassMode();
    this.glass = this.glassMode === 'native' ? new GlassFilter('vis-glass') : null;
    if (this.glass) root.appendChild(this.glass.svg);
    root.classList.add(this.glassMode === 'native' ? 'is-glass-native' : 'is-glass-frost');
    root.dataset.glass = this.glassMode;
    if (this.reduced) root.classList.add('is-reduced');
    const r = root.getBoundingClientRect();
    this.L = layout(r.width || window.innerWidth, r.height || window.innerHeight);
  }

  // ------------------------------------------------------------------ lifecycle
  start() {
    this.applyLayout();
    this.ensureLoaded(this.focal, 1);
    this.listen();
    this.setTicking(true);
    this.autoTimer = window.setInterval(() => this.autoTick(), VIS.AUTO_TICK);
    void this.ready().then(() => { if (!this.destroyed) this.enterStage(); });
    (window as unknown as { __vis?: VisionariesEngine }).__vis = this;
    visionaries.engine = this;
  }

  destroy() {
    this.destroyed = true;
    this.setTicking(false);
    window.clearInterval(this.autoTimer);
    window.clearTimeout(this.bakeTimer);
    this.cancelSmooth?.();
    this.timeline?.kill();
    gsap.killTweensOf(this.bgwrap);
    this.cleanups.forEach((f) => f());
    this.cleanups = [];
    this.glass?.svg.remove();
    const w = window as unknown as { __vis?: VisionariesEngine };
    if (w.__vis === this) delete w.__vis;
    if (visionaries.engine === this) visionaries.engine = null;
  }

  /** Waits for the first backdrop and the disc thumbnails (capped so a slow network never blocks the page). */
  private ready() {
    const decode = (src: string) => { const im = new Image(); im.src = src; return im.decode().catch(() => undefined); };
    const all = Promise.all([decode(this.scenes[this.focal].image), ...this.scenes.map((s) => decode(s.thumb))]);
    return Promise.race([all, new Promise((r) => setTimeout(r, 1600))]);
  }

  /** §10 — one timeline, two tracks: backdrop bloom (2.0 s) and the ring wind-up (2.7 s). */
  private enterStage() {
    if (this.reduced) {
      this.st.enter = 1;
      gsap.set(this.bgwrap, { opacity: 1, scale: 1, clearProps: 'filter' });
      this.finishEntrance();
      this.cb.onReveal();
      return;
    }
    gsap.set(this.bgwrap, { opacity: 0, scale: 1.12, filter: 'blur(20px)' });
    // The first frames of the page compile the glass filter and raster the backdrop (long frames on a cold or busy
    // machine). The timeline starts once frames are regular again, so the wind-up is never swallowed by a stall.
    this.cancelSmooth = whenSmooth(() => { this.cancelSmooth = null; if (!this.destroyed) this.playEntrance(); }, 700);
  }

  private playEntrance() {
    this.entranceStart = performance.now();
    const tl = gsap.timeline({ delay: VIS.ENTER_DELAY, onComplete: () => this.finishEntrance() });
    tl.to(this.bgwrap, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: VIS.ENTER_BG_DUR, ease: 'power3.out', clearProps: 'filter,transform' }, 0);
    tl.to(this.st, { enter: 1, duration: VIS.ENTER_DUR, ease: 'power4.out' }, 0);
    tl.call(() => this.cb.onReveal(), [], 0.9);
    this.timeline = tl;
  }

  private finishEntrance() {
    this.entranceDone = true;
    this.lastAdvance = performance.now();
    this.root.classList.add('is-entered');
    // The other backdrops load once the stage has settled (first paint stays light).
    this.scenes.forEach((_, i) => this.ensureLoaded(i, 0));
  }

  private setTicking(on: boolean) {
    if (on === this.ticking) return;
    this.ticking = on;
    if (on) gsap.ticker.add(this.tick);
    else gsap.ticker.remove(this.tick);
  }

  // ------------------------------------------------------------------ public API (also used by tests)
  /** One slot left (−1) or right (+1); rapid inputs accumulate on the running target. */
  step(dir: number, byUser = true) {
    if (byUser) this.markInput();
    const base = this.tween ? this.tween.to : Math.round(this.pos);
    this.rotateTo(base + Math.sign(dir), this.velocity(), !byUser);
  }

  /** Brings scene i to the top the shortest way round. */
  goTo(i: number, byUser = true) {
    if (byUser) this.markInput();
    const base = this.tween ? this.tween.to : this.pos;
    this.rotateTo(base + wrapOff(i - base), this.velocity());
  }

  /** Pauses everything while a world page covers the stage (and resumes, with a fresh idle timer). */
  setSuspended(on: boolean) {
    this.suspended = on;
    this.root.classList.toggle('is-suspended', on);
    this.setTicking(!on && this.inView && !document.hidden);
    if (!on) { this.markInput(); this.render(performance.now()); }
  }

  /** Puts scene i at the top instantly (used while the stage is hidden behind a world page). */
  jumpTo(i: number) {
    this.tween = null;
    const n = this.scenes.length;
    this.pos = Math.round(this.pos) + wrapOff(i - Math.round(this.pos), n);
    this.render(performance.now());
  }

  /** Centre and face radius of disc i at rest, in viewport pixels (the stage's own transform is ignored). */
  discOrigin(i: number) {
    const r = this.root.getBoundingClientRect();
    const d = discState(i, Math.round(this.pos), this.L, 1, { off: 0, bx: 0, by: 0, topness: 0, scale: 0, lift: 0, z: 0, le: 0 });
    return { x: r.left + r.width / 2 + d.bx, y: r.top + r.height / 2 + d.by - d.lift, r: (this.L.d0 * d.scale) * 0.34 };
  }

  get state() {
    return {
      pos: +this.pos.toFixed(4), focal: this.focal, enter: +this.st.enter.toFixed(4), entranceDone: this.entranceDone,
      tweening: !!this.tween, dragging: !!this.drag, glass: this.glassMode, glassReason: this.glassReason,
      scales: this.glass?.scales ?? null, d0: this.L.d0, layout: { ...this.L }, inView: this.inView, ticking: this.ticking,
      suspended: this.suspended, reduced: this.reduced, sinceInput: Number.isFinite(this.lastInput) ? Math.round(performance.now() - this.lastInput) : null,
      entranceStart: this.entranceStart, now: performance.now(),
    };
  }

  // ------------------------------------------------------------------ motion
  private markInput() {
    this.lastInput = performance.now();
  }

  /** Current carousel velocity in slots per second (0 at rest). */
  private velocity() {
    const t = this.tween;
    if (!t) return 0;
    const now = performance.now();
    return (this.posAt(t, now + 4) - this.posAt(t, now - 4)) / 0.008;
  }

  private posAt(t: Tween, now: number) {
    const u = clamp((now - t.start) / (t.dur * 1000), 0, 1);
    if (t.kind === 'step') return t.from + (t.to - t.from) * easeOutCubic(u);
    if (t.kind === 'auto') return t.from + (t.to - t.from) * easeInOutCubic(u);
    return t.from + t.v0 * t.dur * h10(u) + (t.to - t.from) * h01(u);
  }

  /**
   * Tweens `pos` to `target`: a reader step eases out over STEP_DUR (moves at once), an automatic step eases in-out over AUTO_STEP_DUR. When the ring is already moving towards the
   * target (re-targeted rotation, flick release), a velocity-matched cubic Hermite continues the motion instead of
   * freezing it, with its duration capped so it never overshoots.
   */
  private rotateTo(target: number, v0 = 0, auto = false) {
    const delta = target - this.pos;
    if (Math.abs(delta) < 1e-4) { this.pos = target; this.tween = null; return; }
    if (this.reduced) { this.pos = target; this.tween = null; return; }
    const now = performance.now();
    if (Math.abs(v0) > 0.05 && Math.sign(v0) === Math.sign(delta)) {
      const dur = clamp((2.6 * Math.abs(delta)) / Math.abs(v0), 0.3, VIS.STEP_DUR);
      const v = Math.sign(v0) * Math.min(Math.abs(v0), (2.9 * Math.abs(delta)) / dur);
      this.tween = { from: this.pos, to: target, start: now, dur, kind: 'hermite', v0: v };
    } else {
      this.tween = auto
        ? { from: this.pos, to: target, start: now, dur: VIS.AUTO_STEP_DUR, kind: 'auto', v0: 0 }
        : { from: this.pos, to: target, start: now, dur: VIS.STEP_DUR, kind: 'step', v0: 0 };
    }
  }

  private autoTick() {
    const now = performance.now();
    if (!this.entranceDone || !this.inView || document.hidden || this.drag || this.reduced || this.suspended) return;
    if (this.keyboardFocusInside()) return; // keyboard users read at their own pace
    if (now - this.lastInput < VIS.USER_IDLE || now - this.lastAdvance < VIS.AUTO_INTERVAL) return;
    this.lastAdvance = now;
    this.step(+1, false);
  }

  private readonly tick = () => {
    const now = performance.now();
    if (this.tween) {
      const t = this.tween;
      this.pos = this.posAt(t, now);
      if (now - t.start >= t.dur * 1000) { this.pos = t.to; this.tween = null; }
    }
    this.render(now);
    this.watchPerformance(now);
  };

  /** Writes only what changed (string-compared) so idle frames cost almost nothing. */
  private render(now: number) {
    const L = this.L;
    const c = this.cache;
    const enter = this.st.enter;
    for (let i = 0; i < this.meds.length; i++) {
      const d = discState(i, this.pos, L, enter, this.ds);
      const tr = `translate(-50%,-50%) translate(${d.bx.toFixed(2)}px,${(d.by - d.lift).toFixed(2)}px) scale(${d.scale.toFixed(4)})`;
      if (tr !== c.t[i]) { this.meds[i].style.transform = tr; c.t[i] = tr; }
      const op = d.le.toFixed(3);
      if (op !== c.o[i]) { this.meds[i].style.opacity = op; c.o[i] = op; }
      const vis = d.le < 0.02 ? 'hidden' : 'visible';
      if (vis !== c.v[i]) { this.meds[i].style.visibility = vis; c.v[i] = vis; }
      const z = String(d.z);
      if (z !== c.z[i]) { this.meds[i].style.zIndex = z; c.z[i] = z; }
      // Off-focal discs drain towards monochrome; the thumbnail sharpens in during the entrance.
      const tone = this.scenes[i].tone;
      const blur = (1 - d.le) * 8;
      const f = `grayscale(${clamp((1 - d.topness) * 0.55, 0, 0.55).toFixed(3)}) sepia(${tone === 'ink' ? 0.14 : tone === 'photo' ? 0.08 : 0}) brightness(${(0.9 + 0.1 * d.topness).toFixed(3)})${blur > 0.01 ? ` blur(${blur.toFixed(2)}px)` : ''}`;
      if (f !== c.f[i]) { this.imgs[i].style.filter = f; c.f[i] = f; }
      const rim = (0.42 + 0.4 * d.topness).toFixed(3);
      if (rim !== c.r[i]) { this.rims[i].style.opacity = rim; c.r[i] = rim; }
      // Full chromatic lens for the three discs around the top, the lite lens for the others.
      const full = Math.abs(d.off) < 1.5 ? 'full' : 'lite';
      if (full !== c.lens[i]) { this.meds[i].classList.toggle('is-lens-full', full === 'full'); c.lens[i] = full; }
      const bo = backdropOpacity(d.off).toFixed(3);
      if (bo !== c.bg[i]) {
        // Fully transparent layers are hidden so the browser neither paints nor composites them.
        this.bgs[i].style.opacity = bo;
        this.bgs[i].style.visibility = bo === '0.000' ? 'hidden' : 'visible';
        c.bg[i] = bo;
      }
    }
    const g = (0.32 * smoothstep(clamp(enter, 0, 1))).toFixed(3);
    if (g !== c.glow) { this.glow.style.opacity = g; c.glow = g; }
    if (this.glass && this.inView) {
      if (this.wobbleOverride !== null) this.glass.apply(this.wobbleOverride);
      else if (!this.reduced) this.glass.apply(wobble(now));
    }
    const f = focalIndex(this.pos, this.meds.length);
    if (f !== this.focal) {
      this.focal = f;
      this.root.dataset.focal = String(f);
      this.root.style.setProperty('--vis-accent', this.scenes[f].accent);
      this.ensureLoaded(f, 1);
      this.cb.onFocal(f, performance.now() - this.lastInput < 1500);
    }
  }

  /**
   * Safety net for weak GPUs: if live refraction drags the page under ~22 fps for two seconds after the entrance,
   * the discs fall back to frosted glass (the same fallback as Safari / Firefox).
   */
  private watchPerformance(now: number) {
    const p = this.perf;
    const dt = now - p.last;
    p.last = now;
    if (!this.glass || !this.entranceDone || document.hidden || dt > 250 || p.frames < 0) return;
    p.frames++;
    if (p.frames <= 30) return; // skip the frames right after the entrance
    p.sum += dt;
    if (p.frames < 150) return;
    const avg = p.sum / (p.frames - 30);
    p.frames = -1;
    if (avg > 45) {
      this.root.classList.replace('is-glass-native', 'is-glass-frost');
      this.root.dataset.glass = 'frost';
      this.glassReason = `performance (${avg.toFixed(1)} ms per frame)`;
    }
  }

  private ensureLoaded(center: number, radius: number) {
    const n = this.scenes.length;
    for (let k = -radius; k <= radius; k++) {
      const i = (((center + k) % n) + n) % n;
      if (this.loaded.has(i)) continue;
      this.loaded.add(i);
      this.bgs[i].style.backgroundImage = `url("${this.scenes[i].image}")`;
    }
  }

  // ------------------------------------------------------------------ layout
  private applyLayout() {
    const r = this.root.getBoundingClientRect();
    this.L = layout(r.width, r.height);
    this.root.classList.toggle('is-phone', this.L.phone);
    const px = `${this.L.d0}px`;
    for (const m of this.meds) { m.style.width = px; m.style.height = px; }
    this.cache.t.length = 0;
    if (this.glass) {
      window.clearTimeout(this.bakeTimer);
      if (!this.glass.d0) this.glass.bake(this.L.d0);
      else this.bakeTimer = window.setTimeout(() => this.glass?.bake(this.L.d0), 120);
    }
    if (!this.ticking) this.render(performance.now());
  }

  // ------------------------------------------------------------------ input
  private listen() {
    const root = this.root;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window | Document, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    on(root, 'pointerdown', (e: PointerEvent) => this.onDown(e));
    on(root, 'pointermove', (e: PointerEvent) => this.onMove(e));
    on(root, 'pointerup', (e: PointerEvent) => this.onUp(e));
    on(root, 'pointercancel', (e: PointerEvent) => this.onCancel(e));
    on(root, 'lostpointercapture', (e: PointerEvent) => this.onCancel(e));
    on(root, 'pointerenter', () => { this.hovered = true; });
    on(document, 'pointerdown', () => { this.lastPointerDown = performance.now(); }, { capture: true });
    on(document, 'keydown', () => { this.lastKeyDown = performance.now(); }, { capture: true });
    // Keyboard focus = the reader's latest input was the keyboard (Tab, or Esc closing a world page).
    on(root, 'focusin', () => { this.focusByKeyboard = this.lastKeyDown > this.lastPointerDown; });
    on(root, 'pointerleave', () => { this.hovered = false; });
    on(root, 'wheel', (e: WheelEvent) => this.onWheel(e), { passive: false });
    on(window, 'keydown', (e: KeyboardEvent) => this.onKey(e));
    on(root, 'dragstart', (e: DragEvent) => e.preventDefault());
    root.querySelector('.vis-chev-left')?.addEventListener('click', () => this.step(-1));
    root.querySelector('.vis-chev-right')?.addEventListener('click', () => this.step(+1));

    const ro = new ResizeObserver(() => this.applyLayout());
    ro.observe(root);
    this.cleanups.push(() => ro.disconnect());
    // GPU work (frame loop, glass wobble, live refraction) only while the stage is on screen.
    const io = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      root.classList.toggle('is-offscreen', !this.inView);
      this.setTicking(this.inView && !document.hidden && !this.suspended);
    }, { threshold: 0 });
    io.observe(root);
    this.cleanups.push(() => io.disconnect());
    on(document, 'visibilitychange', () => this.setTicking(this.inView && !document.hidden && !this.suspended));
  }

  private onDown(e: PointerEvent) {
    if (e.button !== 0 || this.drag || this.suspended) return;
    const target = e.target as Element;
    if (target.closest('.vis-chev, .vis-cta, .vis-scroll, a, button')) return;
    const med = target.closest<HTMLElement>('.vis-med');
    this.tween = null; // grab the ring where it is
    this.drag = {
      id: e.pointerId, x0: e.clientX, pos0: this.pos, downIndex: med ? Number(med.dataset.index) : null,
      moved: false, lastPos: this.pos, lastT: performance.now(), vel: 0,
    };
    try { this.root.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    this.markInput();
  }

  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) > VIS.TAP_SLOP) { d.moved = true; this.root.classList.add('is-dragging'); }
    if (!d.moved) return;
    this.pos = d.pos0 - dx / this.L.perStep;
    const now = performance.now();
    const dtms = now - d.lastT;
    if (dtms > 0) {
      const inst = (this.pos - d.lastPos) / (dtms / 16.667);
      d.vel = dtms > 60 ? inst : d.vel * 0.7 + inst * 0.3;
      d.lastPos = this.pos;
      d.lastT = now;
    }
    this.markInput();
    if (!this.ticking) this.render(now);
  }

  private onUp(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    this.root.classList.remove('is-dragging');
    try { this.root.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    this.markInput();
    if (!d.moved) {
      if (d.downIndex === null) return;
      if (d.downIndex === this.focal && Math.abs(wrapOff(d.downIndex - this.pos)) < 0.5) this.cb.onOpen(d.downIndex);
      else this.goTo(d.downIndex);
      return;
    }
    // Flick projection (§12), gentler on phones so one swipe never overshoots to two cards.
    const vel = performance.now() - d.lastT > 90 ? 0 : d.vel;
    const proj = this.L.phone ? clamp(vel * 2.4, -0.5, 0.5) : clamp(vel * 6, -1.2, 1.2);
    this.rotateTo(Math.round(this.pos + proj), vel * 60);
  }

  private onCancel(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    this.root.classList.remove('is-dragging');
    this.rotateTo(Math.round(this.pos));
  }

  /**
   * Trackpad / wheel: exactly one step per flick despite momentum (§12). Only horizontal gestures (or Shift+wheel)
   * rotate the ring; ordinary vertical scrolling is left to the page so the stage never traps it.
   */
  private onWheel(e: WheelEvent) {
    if (this.suspended) return;
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!horizontal && !e.shiftKey) return;
    let dy = horizontal ? e.deltaX : e.deltaY || e.deltaX;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= this.L.H;
    e.preventDefault();
    this.markInput();
    const w = this.wheel;
    const now = performance.now();
    const mag = Math.abs(dy);
    const prev = w.lastMag;
    w.lastMag = mag;
    if (now - w.lastTime > VIS.WHEEL_GAP) { w.acc = 0; w.locked = false; w.peaked = false; }
    w.lastTime = now;
    if (w.locked) {
      if (mag < prev) w.peaked = true; // momentum has begun to decay
      if (!(w.peaked && mag > prev + 10)) return; // swallow the tail
      w.locked = false; w.peaked = false; w.acc = 0; // a real re-acceleration re-arms
    }
    w.acc += dy;
    if (Math.abs(w.acc) >= VIS.WHEEL_THRESHOLD) {
      this.step(Math.sign(w.acc));
      w.acc = 0; w.locked = true; w.peaked = false;
    }
  }

  /** Keyboard focus (not the focus a mouse click leaves on a chevron) is inside the stage. */
  private keyboardFocusInside() {
    const el = document.activeElement;
    return this.focusByKeyboard && !!el && el !== document.body && this.root.contains(el);
  }

  /** ←/→ while the pointer is over the stage or keyboard focus is inside it; ↑/↓ only with keyboard focus inside. */
  private onKey(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || this.suspended) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const focused = this.keyboardFocusInside();
    let dir = 0;
    if (e.key === 'ArrowRight' && (this.hovered || focused)) dir = 1;
    else if (e.key === 'ArrowLeft' && (this.hovered || focused)) dir = -1;
    else if (e.key === 'ArrowDown' && focused) dir = 1;
    else if (e.key === 'ArrowUp' && focused) dir = -1;
    if (!dir) return;
    e.preventDefault();
    this.step(dir);
  }
}
