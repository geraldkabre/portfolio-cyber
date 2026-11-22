import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { World, WorldItem } from './worlds';
import '../styles/world-content.css';

/**
 * One world's summary, shared by Recruiter Mode (full page) and the 3D campus (district panel): giant word,
 * circular visual, motion-design headline, counters, a few items and the GitHub button. Same words, same type.
 */
declare const __HAS_PHOTO__: boolean;

const ext = { target: '_blank', rel: 'noreferrer' } as const;
const linkProps = (href: string) => (href.startsWith('mailto:') ? {} : ext);

export function WorldContent({ world, headingId, level = 1 }: { world: World; headingId?: string; level?: 1 | 2 }) {
  const Heading = level === 1 ? 'h1' : 'h2';
  const photo = world.photo && __HAS_PHOTO__;
  const [zoom, setZoom] = useState<WorldItem['zoom'] | null>(null);
  return (
    <>
      <Viewer item={zoom} onClose={() => setZoom(null)} />
      <div className="w-stage" aria-hidden="true">
        <p className="w-word w-anim">{world.word}</p>
        <div className={`w-visual w-anim${photo ? ' is-photo' : ''}`}>
          {photo ? <img src="/assets/profile/photo.jpg" alt="" /> : <img src={world.image} alt="" style={{ objectPosition: world.imageFocus }} />}
          <span className="w-rim" />
        </div>
        <span className="w-pool" />
      </div>
      <div className="w-copy">
        <Heading id={headingId} className="w-headline" tabIndex={-1}>
          {world.headline.map((line) => <span key={line} className="w-line w-anim">{line}</span>)}
        </Heading>
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
              <li key={it.label} className={`w-item w-anim${it.period ? ' has-period' : ''}`}>
                {it.period && <span className="w-period">{it.period}</span>}
                {it.href ? <a href={it.href} {...linkProps(it.href)}>{it.label}<span aria-hidden="true"> ↗</span></a> : <strong>{it.label}</strong>}
                {it.meta && it.zoom && <button type="button" className="w-zoom" onClick={() => setZoom(it.zoom)} aria-haspopup="dialog">{it.meta}<span aria-hidden="true"> ⤢</span></button>}
                {it.meta && !it.zoom && <span className={it.status ? `w-status ${it.status}` : 'w-dim'}>{it.meta}</span>}
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
          <a className="w-cta" href={world.cta.href} {...linkProps(world.cta.href)}>{world.cta.label}<span aria-hidden="true"> ↗</span></a>
          {world.links?.map((l) => <a key={l.href} className="w-link" href={l.href} {...linkProps(l.href)}>{l.label}</a>)}
        </p>
      </div>
    </>
  );
}

/** Picture viewer (a modal dialog: Esc, the × button or a click outside closes it). */
function Viewer({ item, onClose }: { item: WorldItem['zoom'] | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);
  return (
    <dialog ref={ref} className="w-viewer" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} aria-label={item?.alt}>
      {item && (
        <figure>
          <img src={item.src} alt={item.alt} />
          <figcaption>
            {item.alt}
            {item.verify && <> · <a href={item.verify} target="_blank" rel="noreferrer">Verify on Duolingo ↗</a></>}
          </figcaption>
        </figure>
      )}
      <button type="button" className="w-viewer-close" onClick={onClose} aria-label="Close">×</button>
    </dialog>
  );
}

/**
 * Calls `start` once the browser is producing regular frames again (two consecutive frames under ~25 ms) or
 * after `maxWait` ms: the one-off work of a new page (layout, first raster of large text and pictures) is done
 * before a motion starts, so the motion itself never stutters. Returns a cancel function.
 */
export function whenSmooth(start: () => void, maxWait = 320) {
  const t0 = performance.now();
  let last = 0; let calm = 0; let raf = 0; let done = false;
  const tick = (t: number) => {
    if (done) return;
    if (last) calm = t - last < 25 ? calm + 1 : 0;
    last = t;
    if (calm >= 2 || t - t0 > maxWait) { done = true; start(); return; }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { done = true; cancelAnimationFrame(raf); };
}

/**
 * Motion-design reveal of a world (as in the reference: blur to sharp, counters ticking up with a motion blur).
 * Only transforms and opacity move the large elements (compositor-friendly); blur is kept to the headline lines
 * and the small counters, so the reveal stays fluid on modest GPUs and phones. `speed` > 1 shortens everything.
 * Hidden states use opacity 0.01 (not 0, not visibility): the browser keeps such content rasterized ahead of its
 * entrance, where a fully transparent layer would only be rasterized — with a long frame — once it appears.
 */
export function revealContent(el: HTMLElement, delay = 0, dir = 1, speed = 1) {
  const tl = gsap.timeline({ delay });
  tl.timeScale(speed);
  // Not every world has stats, items or thumbnails: empty selections are skipped (GSAP would warn about them).
  const from = (sel: string, a: gsap.TweenVars, b: gsap.TweenVars, at: number) => {
    const n = el.querySelectorAll(sel);
    if (n.length) tl.fromTo(n, a, b, at);
  };
  from('.w-word', { opacity: 0.01, xPercent: 8 * dir }, { opacity: 1, xPercent: 0, duration: 1.1, ease: 'expo.out' }, 0);
  from('.w-visual', { opacity: 0.01, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out' }, 0.02);
  from('.w-line', { opacity: 0.01, yPercent: 40, filter: 'blur(8px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out', stagger: 0.08, clearProps: 'filter' }, 0.08);
  from('.w-lead, .w-meta', { opacity: 0.01, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, 0.25);
  from('.w-stat', { opacity: 0.01, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, 0.3);
  el.querySelectorAll('.w-num').forEach((n, k) => {
    const node = n as HTMLElement;
    const target = Number(node.dataset.value);
    const start = target >= 1000 ? target - 60 : 0; // years count up from just below, like a dial
    const c = { v: start };
    tl.to(c, {
      v: target, duration: 1.1, ease: 'expo.out',
      onUpdate(this: gsap.core.Tween) {
        node.textContent = String(Math.round(c.v));
        const p = this.progress();
        node.style.filter = p < 1 ? `blur(${(Math.pow(1 - p, 2) * 5).toFixed(2)}px)` : '';
      },
    }, 0.32 + k * 0.07);
  });
  from('.w-item, .w-chips, .w-thumbs li', { opacity: 0.01, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.035 }, 0.38);
  from('.w-actions, .w-next', { opacity: 0.01, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06 }, 0.5);
  return tl;
}
