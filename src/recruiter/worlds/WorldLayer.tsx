import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { WORLDS, worldIndex } from '../../content/worlds';
import { WorldContent, revealContent, whenSmooth } from '../../content/WorldContent';
import { visionaries } from '../visionaries/engine';
import './worlds.css';

/**
 * Timings of the world transitions. Smooth S-curves (no plateau, no velocity jump) on compositor-friendly
 * properties only: clip-path on the page, transform + opacity elsewhere — no animated blur on large layers.
 * The glass ring behind is frozen for the whole transition (its nine refracting discs would otherwise be
 * re-filtered every frame), and a plain dim layer replaces any transform of the stage.
 */
const T = { dive: 1.05, diveEase: 'power3.inOut', bg: 1.5, reveal: 0.38, out: 0.22, close: 0.7 } as const;

export interface Origin { x: number; y: number; r: number }

interface Props {
  id: string;
  /** Where the dive starts (the focal glass disc); null = centre of the screen (deep link). */
  origin: Origin | null;
  leaving: boolean;
  onLeft(): void;
  onClose(): void;
  onGo(id: string): void;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coverRadius = (o: Origin) => Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y)) + 2;

/**
 * The "lens" of the dive, fully composited (no repaint per frame): a circle (rounded overflow clip) scaled from
 * the disc to the whole screen, holding the world's image counter-scaled so the picture itself stays put (only a
 * gentle zoom z). Returns a setter for (circle scale s, picture zoom z).
 */
function placeLens(lens: HTMLElement, o: Origin) {
  const R = coverRadius(o);
  const img = lens.firstElementChild as HTMLElement;
  Object.assign(lens.style, { display: 'block', left: `${o.x - R}px`, top: `${o.y - R}px`, width: `${2 * R}px`, height: `${2 * R}px` });
  Object.assign(img.style, { left: `${R - o.x}px`, top: `${R - o.y}px`, width: `${innerWidth}px`, height: `${innerHeight}px`, transformOrigin: `${o.x}px ${o.y}px` });
  const s0 = Math.max(o.r, 4) / R;
  const set = (s: number, z: number) => {
    lens.style.transform = `scale(${s})`;
    img.style.transform = `scale(${z / s})`;
  };
  return { s0, set, hide: () => { lens.style.display = 'none'; } };
}

/**
 * One world page over the Visionaries stage. Opening: a circle grows from the focal disc while the ring behind
 * pushes in and dims; the summary arrives in a short staggered reveal. Prev / next (arrows, keys, swipe) swap the
 * content in place; closing shrinks back into the disc.
 */
export function WorldLayer({ id, origin, leaving, onLeft, onClose, onGo }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(id);
  const first = useRef(true);
  const dir = useRef(1);
  /** The opening dive (finished early by a swap, cancelled by a close). */
  const enterTl = useRef<gsap.core.Timeline | null>(null);
  const world = WORLDS[worldIndex(shown)];

  // ---------------------------------------------------------------- enter
  useLayoutEffect(() => {
    const el = root.current!;
    const stage = document.querySelector<HTMLElement>('.vis-root');
    document.documentElement.classList.add('w-locked');
    stage?.setAttribute('inert', '');
    document.querySelector('.rc-footer')?.setAttribute('inert', '');
    const o = origin ?? { x: innerWidth / 2, y: innerHeight * 0.45, r: 0 };
    const dim = dimRef.current!;
    visionaries.engine?.setSuspended(true); // frozen ring: no glass re-filtering while the circle grows
    if (reducedMotion()) {
      stage?.classList.add('is-covered');
      gsap.set(dim, { opacity: 0.6 });
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
      el.querySelector<HTMLElement>('.w-headline')?.focus({ preventScroll: true });
      return;
    }
    // Built paused at its first frame: the page lays out and paints before the clock starts (no skipped frames).
    const lens = placeLens(lensRef.current!, o);
    const bg = el.querySelector<HTMLElement>('.w-bg')!;
    bg.style.transformOrigin = `${o.x}px ${o.y}px`;
    const p = { s: lens.s0, z: 1.3 };
    const apply = () => { lens.set(p.s, p.z); bg.style.transform = `scale(${p.z})`; };
    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        lens.hide();
        stage?.classList.add('is-covered'); // fully hidden behind the page: not drawn at all
        el.querySelector<HTMLElement>('.w-headline')?.focus({ preventScroll: true });
      },
    });
    enterTl.current = tl;
    tl.to(p, { s: 1, duration: T.dive, ease: T.diveEase, onUpdate: apply }, 0);
    tl.to(p, { z: 1, duration: T.bg, ease: 'expo.out', onUpdate: apply }, 0);
    // The page (same picture, same zoom) fades in over the lens once the circle is large: a seamless hand-over.
    tl.fromTo(el, { opacity: 0.01 }, { opacity: 1, duration: 0.42, ease: 'power2.out', immediateRender: true }, T.dive * 0.5);
    tl.fromTo(dim, { opacity: 0 }, { opacity: 0.6, duration: T.dive, ease: T.diveEase, immediateRender: true }, 0);
    tl.add(revealContent(el, T.reveal), 0);
    apply();
    tl.progress(0.0001).progress(0);
    const cancel = whenSmooth(() => tl.play());
    return () => { cancel(); tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------- previous / next: swap in place
  useEffect(() => {
    if (id === shown) return;
    const el = root.current!;
    const to = worldIndex(id);
    const from = worldIndex(shown);
    dir.current = (to - from + WORLDS.length) % WORLDS.length <= WORLDS.length / 2 ? 1 : -1;
    if (enterTl.current?.isActive()) enterTl.current.progress(1); // a quick reader skips the rest of the dive
    visionaries.engine?.jumpTo(to);
    if (reducedMotion()) { setShown(id); return; }
    const tl = gsap.timeline({ onComplete: () => setShown(id) });
    tl.to(el.querySelectorAll('.w-anim'), { opacity: 0, x: -28 * dir.current, duration: T.out, ease: 'power2.in', stagger: { amount: 0.06 } }, 0);
    tl.to(el.querySelector('.w-bg'), { opacity: 0.25, duration: T.out + 0.06, ease: 'power2.in' }, 0);
    return () => { tl.kill(); };
  }, [id, shown]);

  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = root.current!;
    el.scrollTo({ top: 0 });
    gsap.set(el.querySelectorAll('.w-anim'), { clearProps: 'all' });
    if (reducedMotion()) return;
    // New content is mounted hidden (its reveal's first frame); the motion starts once it has been painted.
    const bg = gsap.fromTo(el.querySelector('.w-bg'), { opacity: 0.25, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out', paused: true });
    const tl = revealContent(el, 0, dir.current, 1.25).pause();
    tl.progress(0.0001).progress(0);
    const cancel = whenSmooth(() => { bg.play(); tl.play(); }, 200);
    el.querySelector<HTMLElement>('.w-headline')?.focus({ preventScroll: true });
    return () => { cancel(); bg.kill(); tl.kill(); };
  }, [shown]);

  // ---------------------------------------------------------------- leave: shrink back into the disc
  useEffect(() => {
    if (!leaving) return;
    const el = root.current!;
    const stage = document.querySelector<HTMLElement>('.vis-root');
    enterTl.current?.kill();
    enterTl.current = null;
    // The ring stays frozen while the circle shrinks, and comes back to life once the page is gone.
    const done = () => {
      document.documentElement.classList.remove('w-locked');
      stage?.removeAttribute('inert');
      document.querySelector('.rc-footer')?.removeAttribute('inert');
      visionaries.engine?.setSuspended(false);
      onLeft();
    };
    const dim = dimRef.current!;
    if (reducedMotion()) { gsap.to([el, dim], { autoAlpha: 0, duration: 0.2, onComplete: done }); return; }
    stage?.classList.remove('is-covered');
    const o = visionaries.engine?.discOrigin(worldIndex(shown)) ?? { x: innerWidth / 2, y: innerHeight / 2, r: 0 };
    // Reverse hand-over: the lens (same picture) takes the place of the page, then shrinks into the disc.
    const lens = placeLens(lensRef.current!, o);
    const p = { s: 1 };
    lens.set(1, 1);
    const tl = gsap.timeline({ paused: true, onComplete: () => { lens.hide(); done(); } });
    tl.to(el, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
    tl.to(p, { s: lens.s0, duration: T.close, ease: 'power3.inOut', onUpdate: () => lens.set(p.s, 1) }, 0.08);
    tl.to(dim, { opacity: 0, duration: T.close, ease: 'power3.inOut' }, 0.08);
    // The ring becomes drawable again first; the shrink starts once it has been painted (no hitch).
    const cancel = whenSmooth(() => tl.play(), 200);
    return () => { cancel(); tl.kill(); };
  }, [leaving, onLeft, shown]);

  // ---------------------------------------------------------------- decode the neighbours' images ahead (smooth swaps)
  useEffect(() => {
    const t = worldIndex(id);
    for (const k of [t - 1, t + 1]) {
      const w = WORLDS[(k + WORLDS.length) % WORLDS.length];
      const im = new Image();
      im.src = w.image;
      void im.decode().catch(() => undefined);
    }
  }, [id]);

  // ---------------------------------------------------------------- keyboard: Esc closes, ←/→ change world
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (leaving || e.altKey || e.ctrlKey || e.metaKey) return;
      const i = worldIndex(id);
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onGo(WORLDS[(i + 1) % WORLDS.length].id); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onGo(WORLDS[(i - 1 + WORLDS.length) % WORLDS.length].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, leaving, onClose, onGo]);

  // ---------------------------------------------------------------- touch: swipe left / right between worlds
  useEffect(() => {
    const el = root.current!;
    let start: { x: number; y: number; t: number; id: number } | null = null;
    const down = (e: PointerEvent) => { if (e.pointerType !== 'mouse') start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id || leaving) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y, dt = performance.now() - start.t;
      start = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || dt > 800) return;
      const i = worldIndex(id);
      onGo(WORLDS[(i + (dx < 0 ? 1 : -1) + WORLDS.length) % WORLDS.length].id);
    };
    const cancel = () => { start = null; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); };
  }, [id, leaving, onGo]);

  const i = worldIndex(shown);
  // Navigation follows the requested world (a click during a swap goes one further, not to the same page).
  const t = worldIndex(id);
  const prev = WORLDS[(t - 1 + WORLDS.length) % WORLDS.length];
  const next = WORLDS[(t + 1) % WORLDS.length];
  return (
    <>
    <div ref={dimRef} className="w-dim" aria-hidden="true" />
    <div ref={lensRef} className="w-lens" aria-hidden="true"><div className="w-lens-img" style={{ backgroundImage: `url("${world.image}")` }} /></div>
    <div ref={root} className="w-layer" role="dialog" aria-modal="true" aria-labelledby="w-title" style={{ ['--w-accent' as string]: world.accent }}>
      <div className="w-bg" aria-hidden="true" style={{ backgroundImage: `url("${world.image}")` }} />
      <div className="w-shade" aria-hidden="true" />
      <header className="w-top">
        <button type="button" className="w-back" onClick={onClose}><span aria-hidden="true">←</span> All worlds</button>
        <p className="w-index"><span>{String(i + 1).padStart(2, '0')}</span> / {String(WORLDS.length).padStart(2, '0')} · {world.title}</p>
        <nav className="w-arrows" aria-label="Other worlds">
          <button type="button" onClick={() => onGo(prev.id)} aria-label={`Previous world: ${prev.title}`}>←</button>
          <button type="button" onClick={() => onGo(next.id)} aria-label={`Next world: ${next.title}`}>→</button>
        </nav>
      </header>
      <p className="w-swipe-hint" aria-hidden="true">{String(i + 1).padStart(2, '0')} / {String(WORLDS.length).padStart(2, '0')} · swipe for the next world</p>
      <main className="w-hero">
        <WorldContent world={world} headingId="w-title" />
      </main>
      <footer className="w-next w-anim">
        <span>Next world</span>
        <button type="button" onClick={() => onGo(next.id)}>{next.title}<span aria-hidden="true"> →</span></button>
      </footer>
    </div>
    </>
  );
}
