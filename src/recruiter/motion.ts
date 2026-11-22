/**
 * Recruiter Mode — motion layer (GSAP + ScrollTrigger). Content is always in the DOM and readable without it;
 * this only adds: section reveals (heading, then a short stagger of the section's blocks), skill bars filling,
 * interactive cards (lift, gentle tilt, pointer spotlight), the sliding active-section indicator of the sticky
 * navigation, and a subtle parallax on the Visionaries stage and the profile photo.
 * Reduced motion: no reveals, tilt or parallax; the navigation indicator still tracks the section, instantly.
 * The Visionaries ring keeps sole ownership of its disc transforms (only its containers are touched here).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const BLOCKS = '.sec-timeline, .sec-cards, .sec-certs, .sec-figures, .sec-levels, .sec-langs, .sec-contact, .sec-tags, .sec-method';

/** The animated units of a section: list / grid items, table rows, then any other direct child block. */
function revealTargets(sec: HTMLElement) {
  const out: Element[] = [];
  for (const child of Array.from(sec.children)) {
    if (child.classList.contains('sec-head')) continue;
    if (child.matches(BLOCKS)) out.push(...Array.from(child.children));
    else if (child.classList.contains('sec-table-wrap')) out.push(child.querySelector('thead') ?? child, ...Array.from(child.querySelectorAll('tbody tr')));
    else if (child.classList.contains('sec-profile')) {
      // Photo (parallax, faded separately) and the name block's lines.
      for (const c of Array.from(child.children)) if (!c.classList.contains('sec-avatar')) out.push(...Array.from(c.children));
    }
    else out.push(child);
  }
  return out;
}

export function initRecruiterMotion(page: HTMLElement) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cleanups: Array<() => void> = [];

  const ctx = gsap.context(() => {
    // ---------------------------------------------------------------- section reveals
    if (!reduced) {
      page.querySelectorAll<HTMLElement>('.rc-hero .sec, main .sec').forEach((sec) => {
        const heading = sec.querySelector('.sec-head h2, .sec-name');
        const items = revealTargets(sec).filter((el) => el !== heading && !el.contains(heading));
        const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 86%', once: true } });
        if (heading) {
          // Typography settles: tracking tightens and the blur clears as the title rises.
          tl.from(heading, { y: 18, autoAlpha: 0, letterSpacing: '0.08em', filter: 'blur(6px)', duration: 0.75, ease: 'power3.out', clearProps: 'filter,letterSpacing,transform' }, 0);
        }
        const head = sec.querySelector('.sec-head');
        const extras = head ? Array.from(head.querySelectorAll('.sec-gh, .sec-dim')) : [];
        if (extras.length) tl.from(extras, { autoAlpha: 0, duration: 0.5, ease: 'power2.out', stagger: 0.06 }, 0.2);
        if (items.length) {
          tl.from(items, {
            y: 16, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform',
            stagger: { each: 0.055, amount: Math.min(0.6, items.length * 0.055) },
          }, heading ? 0.18 : 0);
        }
        const avatar = sec.querySelector('.sec-avatar');
        if (avatar) tl.from(avatar, { autoAlpha: 0, scale: 0.94, duration: 0.9, ease: 'power3.out' }, 0);
        const bars = sec.querySelectorAll('.sec-bar i');
        if (bars.length) tl.from(bars, { scaleX: 0, transformOrigin: '0 50%', duration: 0.9, ease: 'power3.out', stagger: 0.06 }, 0.35);
      });

      // ---------------------------------------------------------------- parallax (scrubbed, transforms only)
      const stage = page.querySelector<HTMLElement>('.vis-root');
      if (stage) {
        const st = { trigger: stage, start: 'top top', end: 'bottom top', scrub: 0.6 };
        gsap.to(stage.querySelector('.vis-orbit'), { y: 70, ease: 'none', scrollTrigger: st });
        gsap.to(stage.querySelector('.vis-title-inner'), { y: 120, autoAlpha: 0.25, ease: 'none', scrollTrigger: { ...st } });
        gsap.to(stage.querySelector('.vis-scroll'), { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: stage, start: 'top top', end: '25% top', scrub: true } });
      }
      const avatar = page.querySelector('.rc-hero .sec-avatar');
      if (avatar) gsap.fromTo(avatar, { y: -14 }, { y: 14, ease: 'none', scrollTrigger: { trigger: '.rc-hero', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    }

    // ---------------------------------------------------------------- interactive cards
    if (fine && !reduced) {
      page.querySelectorAll<HTMLElement>('.sec-card').forEach((card) => {
        gsap.set(card, { transformPerspective: 900 });
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
          card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
          ry((px - 0.5) * 4); // at most ±2°
          rx((0.5 - py) * 4);
        };
        const enter = () => { card.classList.add('is-hot'); gsap.set(card, { transformPerspective: 900 }); gsap.to(card, { y: -4, duration: 0.35, ease: 'power3.out', overwrite: 'auto' }); };
        const leave = () => { card.classList.remove('is-hot'); rx(0); ry(0); gsap.to(card, { y: 0, duration: 0.45, ease: 'power3.out', overwrite: 'auto' }); };
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerenter', enter);
        card.addEventListener('pointerleave', leave);
        cleanups.push(() => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerenter', enter); card.removeEventListener('pointerleave', leave); });
      });
    }

    // ---------------------------------------------------------------- navigation: active section indicator
    const nav = page.querySelector<HTMLElement>('.rc-nav');
    const ink = nav?.querySelector<HTMLElement>('.rc-nav-ink');
    const links = nav ? Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) : [];
    if (nav && ink && links.length) {
      let current: HTMLAnchorElement | null = null;
      const setActive = (link: HTMLAnchorElement | null) => {
        if (link === current) return;
        current?.removeAttribute('aria-current');
        current = link;
        if (!link) { gsap.to(ink, { autoAlpha: 0, duration: reduced ? 0 : 0.25 }); return; }
        link.setAttribute('aria-current', 'true');
        const track = link.parentElement!;
        gsap.to(ink, { x: link.offsetLeft, width: link.offsetWidth, autoAlpha: 1, duration: reduced ? 0 : 0.45, ease: 'power3.out' });
        // Keep the active link visible in the horizontally scrolling bar (phones).
        const left = link.offsetLeft - track.clientWidth / 2 + link.offsetWidth / 2;
        track.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
      };
      // Contiguous bands: a section is active from the moment its top crosses the reading line (45 % of the
      // viewport) until the next section's top does; the last one also wins at the very bottom of the page.
      // A clicked link stays active (the page may not be able to scroll its section up to the line) until the
      // reader scrolls again.
      const bands: { link: HTMLAnchorElement; st: ScrollTrigger }[] = [];
      let pinned: HTMLAnchorElement | null = null;
      const recompute = () => {
        if (pinned) { setActive(pinned); return; }
        let pick: HTMLAnchorElement | null = null;
        for (const b of bands) if (b.st.isActive) pick = b.link;
        const max = ScrollTrigger.maxScroll(window);
        if (max > 0 && window.scrollY >= max - 4 && bands.length) pick = bands[bands.length - 1].link;
        setActive(pick);
      };
      const targets = links.map((l) => page.querySelector<HTMLElement>(l.getAttribute('href')!));
      links.forEach((link, i) => {
        const target = targets[i];
        if (!target) return;
        const next = targets.slice(i + 1).find(Boolean);
        bands.push({
          link,
          st: ScrollTrigger.create({
            trigger: target, start: 'top 45%', ...(next ? { endTrigger: next, end: 'top 45%' } : { end: 'max' }), onToggle: recompute,
          }),
        });
        const click = () => { pinned = link; setActive(link); };
        link.addEventListener('click', click);
        cleanups.push(() => link.removeEventListener('click', click));
      });
      const unpin = () => { if (pinned) { pinned = null; recompute(); } };
      for (const type of ['wheel', 'touchstart', 'keydown'] as const) window.addEventListener(type, unpin, { passive: true });
      cleanups.push(() => { for (const type of ['wheel', 'touchstart', 'keydown'] as const) window.removeEventListener(type, unpin); });
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: recompute });
      ScrollTrigger.addEventListener('refresh', recompute);
      cleanups.push(() => ScrollTrigger.removeEventListener('refresh', recompute));
      ScrollTrigger.create({ trigger: nav, start: 'top top', end: 'max', toggleClass: { targets: nav, className: 'is-stuck' } });
      const relayout = () => { if (current) gsap.set(ink, { x: current.offsetLeft, width: current.offsetWidth }); };
      window.addEventListener('resize', relayout);
      cleanups.push(() => window.removeEventListener('resize', relayout));
    }
  }, page);

  // Fonts and lazy images change the page height: recompute the trigger positions whenever it changes.
  const refresh = () => ScrollTrigger.refresh();
  void document.fonts?.ready.then(refresh);
  window.addEventListener('load', refresh, { once: true });
  let lastHeight = document.documentElement.scrollHeight;
  let timer = 0;
  const ro = new ResizeObserver(() => {
    const h = document.documentElement.scrollHeight;
    if (Math.abs(h - lastHeight) < 2) return;
    lastHeight = h;
    window.clearTimeout(timer);
    timer = window.setTimeout(refresh, 120);
  });
  ro.observe(page);
  cleanups.push(() => { ro.disconnect(); window.clearTimeout(timer); });

  return () => {
    cleanups.forEach((f) => f());
    window.removeEventListener('load', refresh);
    ctx.revert();
  };
}
