import { useCallback, useEffect, useRef, useState } from 'react';
import { GITHUB, PROFILE } from '../content/profile';
import { Visionaries } from './visionaries/Visionaries';
import { visionaries } from './visionaries/engine';
import { WorldLayer, type Origin } from './worlds/WorldLayer';
import { WORLDS, worldIndex } from './worlds/content';

/** Route = the open world, kept in the URL (#/education) so it can be shared and Back closes it. */
const readRoute = () => {
  const m = /^#\/([\w-]+)$/.exec(location.hash);
  return m && worldIndex(m[1]) >= 0 ? m[1] : null;
};

/**
 * Recruiter Mode: the nine worlds on a ring of glass (Visionaries). Opening one dives into its own page — a short
 * summary with a direct link to the full details on GitHub. No 3D engine, no audio.
 */
export function Recruiter() {
  const [route, setRoute] = useState<string | null>(readRoute);
  const [layer, setLayer] = useState<{ id: string; origin: Origin | null; leaving: boolean } | null>(null);
  const pendingOrigin = useRef<Origin | null>(null);

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop); };
  }, []);

  // The URL drives the layer: open, switch, or start the closing dive.
  useEffect(() => {
    if (route) {
      if (!layer) {
        const origin = pendingOrigin.current;
        pendingOrigin.current = null;
        if (!origin) visionaries.engine?.jumpTo(worldIndex(route)); // deep link: the ring waits on this world
        setLayer({ id: route, origin, leaving: false });
      } else if (layer.id !== route || layer.leaving) setLayer({ ...layer, id: route, leaving: false });
    } else if (layer && !layer.leaving) setLayer({ ...layer, leaving: true });
  }, [route, layer]);

  /** From the ring (focal disc or its button): the dive starts from that disc. */
  const open = useCallback((id: string) => {
    pendingOrigin.current = visionaries.engine?.discOrigin(worldIndex(id)) ?? null;
    history.pushState({ world: id, fromRing: true }, '', `#/${id}`);
    setRoute(id);
  }, []);
  const go = useCallback((id: string) => {
    history.replaceState({ world: id, fromRing: !!(history.state as { fromRing?: boolean } | null)?.fromRing }, '', `#/${id}`);
    setRoute(id);
  }, []);
  const close = useCallback(() => {
    if ((history.state as { fromRing?: boolean } | null)?.fromRing) history.back();
    else { history.replaceState(null, '', location.pathname + location.search); setRoute(null); }
  }, []);
  const onLeft = useCallback(() => {
    setLayer(null);
    document.querySelector<HTMLElement>('.vis-cta')?.focus({ preventScroll: true });
  }, []);

  const email = PROFILE.links.email;
  return (
    <div className="rc-page">
      <div className="rc-chrome">
        <p className="rc-brand">CYBERVERSE<span> · Recruiter Mode</span></p>
        <a className="rc-switch" href="/?mode=immersive"><span>Immersive </span>3D campus →</a>
      </div>
      <Visionaries onOpen={open} />
      <footer className="rc-footer">
        <p className="rc-footer-name">{PROFILE.name} <span>· {PROFILE.summary}</span></p>
        <p className="rc-footer-links">
          <a href={GITHUB.profile} target="_blank" rel="noreferrer">GitHub</a>
          <a href={PROFILE.links.rootme} target="_blank" rel="noreferrer">Root-Me</a>
          {email && <a href={`mailto:${email}`}>E-mail</a>}
          <a href="/?mode=immersive">Immersive 3D campus</a>
          <a href="/">Home</a>
        </p>
      </footer>
      {layer && <WorldLayer id={layer.id} origin={layer.origin} leaving={layer.leaving} onLeft={onLeft} onClose={close} onGo={go} />}
      <PrintSummary />
    </div>
  );
}

/** Printed version: every world's summary on paper (the ring and the world pages are screen-only). */
function PrintSummary() {
  return (
    <section className="rc-print" aria-hidden="true">
      <h1>{PROFILE.name}</h1>
      <p>{PROFILE.title} · {PROFILE.location} — {PROFILE.summary}</p>
      {WORLDS.slice(1).map((w) => (
        <div key={w.id} className="rc-print-world">
          <h2>{w.title}</h2>
          <p>{w.lead}</p>
          {w.items && <ul>{w.items.map((i) => <li key={i.label}>{i.label}{i.meta ? ` — ${i.meta}` : ''}</li>)}</ul>}
          {w.chips?.map((c) => <p key={c.title}><strong>{c.title}:</strong> {c.list.join(' · ')}</p>)}
          {w.thumbs && <p>{w.thumbs.map((t) => t.alt).join(' · ')}</p>}
          <p className="rc-print-link">{w.cta.label}: {w.cta.href}</p>
        </div>
      ))}
    </section>
  );
}
