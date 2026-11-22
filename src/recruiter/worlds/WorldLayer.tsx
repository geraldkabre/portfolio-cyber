import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { EasePack } from 'gsap/EasePack';
import { WORLDS, worldIndex, type World } from './content';
import { visionaries } from '../visionaries/engine';
import './worlds.css';

gsap.registerPlugin(EasePack);

declare const __HAS_PHOTO__: boolean;

/** Fast in, slow-motion middle, fast out (GSAP SlowMo): the "slow-mo" of the dive into a world. */
const SLOWMO = 'slow(0.55, 0.85, false)';
const ext = { target: '_blank', rel: 'noreferrer' } as const;

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
 * One world page over the Visionaries stage. Opening: a circle grows from the focal disc (slow-motion ease) while
 * the ring behind pushes in and blurs; then the giant word, the headline, the counters and the details arrive
 * with a blur-to-sharp reveal. Prev / next swap the content in place; closing shrinks back into the disc.
 */
export function WorldLayer({ id, origin, leaving, onLeft, onClose, onGo }: Props) {
  const root = useRef<HTMLDivElement>(null);
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
    if (reducedMotion()) {
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
      visionaries.engine?.setSuspended(true);
      el.querySelector<HTMLElement>('.w-headline')?.focus({ preventScroll: true });
      return;
    }
    // Built paused, at its first frame: the new page lays out and paints (fonts, images, large text) before the
    // clock starts, so the dive never skips its opening frames.
    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        gsap.set(el, { clearProps: 'clipPath' });
        el.querySelector<HTMLElement>('.w-headline')?.focus({ preventScroll: true });
      },
    });
    enterTl.current = tl;
    // Once the circle covers the screen, the ring behind stops working (no frame loop, no glass, no input).
    tl.call(() => visionaries.engine?.setSuspended(true), [], 1.95);
    tl.fromTo(el, { clipPath: `circle(${o.r}px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(${coverRadius(o)}px at ${o.x}px ${o.y}px)`, duration: 1.9, ease: SLOWMO, immediateRender: true }, 0);
    tl.fromTo(el.querySelector('.w-bg'), { scale: 1.55, transformOrigin: `${o.x}px ${o.y}px` }, { scale: 1, duration: 2.3, ease: 'expo.out', immediateRender: true }, 0);
    if (stage) tl.to(stage, { scale: 1.12, filter: 'blur(8px) brightness(0.55)', duration: 1.9, ease: SLOWMO }, 0);
    tl.add(revealContent(el, 0.55), 0);
    tl.progress(0.0001).progress(0); // render the opening state now (content hidden, small circle)
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => tl.play()); });
    return () => { cancelAnimationFrame(raf); tl.kill(); };
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
    tl.to(el.querySelectorAll('.w-anim'), { autoAlpha: 0, x: -50 * dir.current, filter: 'blur(10px)', duration: 0.32, ease: 'power2.in', stagger: { amount: 0.12 } }, 0);
    tl.to(el.querySelector('.w-bg'), { autoAlpha: 0.2, duration: 0.38 }, 0);
    return () => { tl.kill(); };
  }, [id, shown]);

  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = root.current!;
    el.scrollTo({ top: 0 });
    gsap.set(el.querySelectorAll('.w-anim'), { clearProps: 'all' });
    if (reducedMotion()) return;
    gsap.fromTo(el.querySelector('.w-bg'), { autoAlpha: 0.2, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'expo.out' });
    const tl = revealContent(el, 0, dir.current);
    el.querySelector<HTMLElement>('.w-headline')?.focus({ preventScroll: true });
    return () => { tl.kill(); };
  }, [shown]);

  // ---------------------------------------------------------------- leave: shrink back into the disc
  useEffect(() => {
    if (!leaving) return;
    const el = root.current!;
    const stage = document.querySelector<HTMLElement>('.vis-root');
    enterTl.current?.kill(); // closing during the dive: never suspend the ring afterwards
    enterTl.current = null;
    visionaries.engine?.setSuspended(false);
    const release = () => {
      document.documentElement.classList.remove('w-locked');
      stage?.removeAttribute('inert');
      document.querySelector('.rc-footer')?.removeAttribute('inert');
    };
    if (reducedMotion()) {
      gsap.to(el, { autoAlpha: 0, duration: 0.2, onComplete: () => { release(); if (stage) gsap.set(stage, { clearProps: 'transform,filter' }); onLeft(); } });
      return;
    }
    const o = visionaries.engine?.discOrigin(worldIndex(shown)) ?? { x: innerWidth / 2, y: innerHeight / 2, r: 0 };
    const tl = gsap.timeline({ onComplete: () => { release(); if (stage) gsap.set(stage, { clearProps: 'transform,filter' }); onLeft(); } });
    tl.to(el.querySelectorAll('.w-anim'), { autoAlpha: 0, y: -12, filter: 'blur(8px)', duration: 0.3, ease: 'power2.in' }, 0);
    tl.fromTo(el, { clipPath: `circle(${coverRadius(o)}px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(${o.r}px at ${o.x}px ${o.y}px)`, duration: 1.05, ease: 'expo.inOut' }, 0.12);
    if (stage) tl.to(stage, { scale: 1, filter: 'blur(0px) brightness(1)', duration: 1.05, ease: 'expo.inOut' }, 0.12);
    return () => { tl.kill(); };
  }, [leaving, onLeft, shown]);

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

  const i = worldIndex(shown);
  // Navigation follows the requested world (a click during a swap goes one further, not to the same page).
  const t = worldIndex(id);
  const prev = WORLDS[(t - 1 + WORLDS.length) % WORLDS.length];
  const next = WORLDS[(t + 1) % WORLDS.length];
  return (
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
      <WorldContent world={world} />
      <footer className="w-next w-anim">
        <span>Next world</span>
        <button type="button" onClick={() => onGo(next.id)}>{next.title}<span aria-hidden="true"> →</span></button>
      </footer>
    </div>
  );
}

function WorldContent({ world }: { world: World }) {
  return (
    <main className="w-hero">
      <div className="w-stage" aria-hidden="true">
        <p className="w-word w-anim" data-word>{world.word}</p>
        <div className="w-visual w-anim">
          {world.photo && __HAS_PHOTO__
            ? <img src="/assets/profile/photo.jpg" alt="" />
            : <img src={world.image} alt="" style={{ objectPosition: world.imageFocus }} />}
          <span className="w-rim" />
        </div>
        <span className="w-pool" />
      </div>
      <div className="w-copy">
        <h1 id="w-title" className="w-headline" tabIndex={-1}>
          {world.headline.map((line) => <span key={line} className="w-line w-anim">{line}</span>)}
        </h1>
        <p className="w-lead w-anim">{world.lead}</p>
        {world.meta && <p className="w-meta w-anim">{world.meta}</p>}
        {world.stats.length > 0 && (
          <dl className="w-stats">
            {world.stats.map((s) => (
              <div key={s.label} className="w-stat w-anim">
                <dt>{s.label}</dt>
                <dd className="w-num" data-value={s.value}>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {world.items && (
          <ul className="w-items">
            {world.items.map((it) => (
              <li key={it.label} className="w-item w-anim">
                {it.href ? <a href={it.href} {...(it.href.startsWith('mailto:') ? {} : ext)}>{it.label}<span aria-hidden="true"> ↗</span></a> : <strong>{it.label}</strong>}
                {it.meta && <span className={it.status ? `w-status ${it.status}` : 'w-dim'}>{it.meta}</span>}
              </li>
            ))}
          </ul>
        )}
        {world.chips?.map((c) => (
          <div key={c.title} className="w-chips w-anim">
            <p className="w-chips-title">{c.title}</p>
            <p className="w-chip-list">{c.list.map((t) => <span key={t}>{t}</span>)}</p>
          </div>
        ))}
        {world.thumbs && (
          <ul className="w-thumbs">
            {world.thumbs.map((t) => (
              <li key={t.href} className="w-anim"><a href={t.href} {...ext} title={`${t.alt} — certificate on GitHub`}><img src={t.src} alt={t.alt} loading="lazy" width={260} height={180} /></a></li>
            ))}
          </ul>
        )}
        <p className="w-actions w-anim">
          <a className="w-cta" href={world.cta.href} {...(world.cta.href.startsWith('mailto:') ? {} : ext)}>{world.cta.label}<span aria-hidden="true"> ↗</span></a>
          {world.links?.map((l) => <a key={l.href} className="w-link" href={l.href} {...(l.href.startsWith('mailto:') ? {} : ext)}>{l.label}</a>)}
        </p>
      </div>
    </main>
  );
}

/**
 * Motion-design reveal of a world's content (blur to sharp, as in the reference): giant word drifting in, visual
 * blooming, headline lines rising, counters ticking up with a motion blur that clears as they settle.
 */
function revealContent(el: HTMLElement, delay: number, dir = 1) {
  const tl = gsap.timeline({ delay });
  // Not every world has stats, items or thumbnails: empty selections are skipped (GSAP would warn about them).
  const from = (sel: string, a: gsap.TweenVars, b: gsap.TweenVars, at: number) => {
    const n = el.querySelectorAll(sel);
    if (n.length) tl.fromTo(n, a, b, at);
  };
  from('.w-word', { autoAlpha: 0, xPercent: 14 * dir, filter: 'blur(24px)' }, { autoAlpha: 1, xPercent: 0, filter: 'blur(0px)', duration: 1.8, ease: 'expo.out' }, 0);
  from('.w-visual', { autoAlpha: 0, scale: 0.8, filter: 'blur(12px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.5, ease: 'expo.out' }, 0.05);
  from('.w-line', { autoAlpha: 0, yPercent: 55, filter: 'blur(14px)' }, { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.15, ease: 'expo.out', stagger: 0.13 }, 0.2);
  from('.w-lead, .w-meta', { autoAlpha: 0, y: 14, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.5);
  from('.w-stat', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, 0.55);
  el.querySelectorAll('.w-num').forEach((n, k) => {
    const node = n as HTMLElement;
    const target = Number(node.dataset.value);
    const from = target >= 1000 ? target - 60 : 0; // years count up from just below, like a dial
    const c = { v: from };
    tl.to(c, {
      v: target, duration: 1.7, ease: 'expo.out',
      onUpdate(this: gsap.core.Tween) {
        node.textContent = String(Math.round(c.v));
        const p = this.progress();
        node.style.filter = p < 1 ? `blur(${(Math.pow(1 - p, 2) * 7).toFixed(2)}px)` : '';
      },
    }, 0.6 + k * 0.12);
  });
  from('.w-item, .w-chips, .w-thumbs li', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 }, 0.75);
  from('.w-actions, .w-next', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 }, 0.95);
  return tl;
}
