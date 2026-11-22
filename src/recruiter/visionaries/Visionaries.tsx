import { memo, useEffect, useRef, useState } from 'react';
import { VIS } from './geometry';
import { VisionariesEngine } from './engine';
import { SCENES, type Scene } from './scenes';
import './visionaries.css';

/**
 * Visionaries — full-viewport hero of Recruiter Mode: nine portfolio parts ride a ring of liquid-glass discs; the one
 * at the top fills the stage. Spec: docs/cyberverse/pantheon.md. The DOM is rendered once; the engine animates it.
 */
export function Visionaries({ onOpen }: { onOpen: (world: string) => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const [focal, setFocal] = useState<number>(VIS.INITIAL);
  const [revealed, setRevealed] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    const engine = new VisionariesEngine(rootRef.current!, SCENES, {
      onFocal: (i, byUser) => { setFocal(i); setAnnounce(byUser); },
      onReveal: () => setRevealed(true),
      onOpen: (i) => openRef.current(SCENES[i].id),
    });
    engine.start();
    return () => engine.destroy();
  }, []);

  const scene = SCENES[focal];
  return (
    <section ref={rootRef} className="vis-root" aria-roledescription="carousel" aria-label="Portfolio overview: nine parts">
      <Stage scenes={SCENES} />
      <div className="vis-title" aria-live={announce ? 'polite' : 'off'}>
        <div className="vis-title-inner">
        {revealed && (
          <>
            <h2 key={`t${focal}`} className="vis-title-name">{scene.title}</h2>
            <p key={`c${focal}`} className="vis-title-sub">{scene.caption}</p>
            <a key={`a${focal}`} className="vis-cta" href={`#/${scene.id}`}
              onClick={(e) => { e.preventDefault(); onOpen(scene.id); }}>
              Enter this world
              <span aria-hidden="true"> →</span>
            </a>
          </>
        )}
        </div>
      </div>
      <button type="button" className="vis-chev vis-chev-left" aria-label="Rotate left"><Chevron dir={-1} /></button>
      <button type="button" className="vis-chev vis-chev-right" aria-label="Rotate right"><Chevron dir={1} /></button>
      <p className="vis-scroll" aria-hidden="true">Turn the ring · tap a world to enter</p>
      {/* Every world, directly reachable with the keyboard or a screen reader. */}
      <nav className="vis-sr" aria-label="The nine worlds">
        <ul>{SCENES.map((s) => <li key={s.id}><a href={`#/${s.id}`} onClick={(e) => { e.preventDefault(); onOpen(s.id); }}>{s.title}: {s.caption}</a></li>)}</ul>
      </nav>
    </section>
  );
}

/** Static layers (rendered once, never re-rendered: the engine owns their styles). */
const Stage = memo(function Stage({ scenes }: { scenes: Scene[] }) {
  return (
    <>
      <div className="vis-bgwrap" aria-hidden="true">
        {scenes.map((s, i) => (
          <div key={s.id} className="vis-bg" style={{ backgroundPosition: s.bgFocus, opacity: i === VIS.INITIAL ? 1 : 0 }} />
        ))}
      </div>
      <div className="vis-vignette" aria-hidden="true" />
      <div className="vis-glow" aria-hidden="true" />
      <div className="vis-orbit">
        {scenes.map((s, i) => (
          <div key={s.id} className="vis-med" data-index={i} style={{ visibility: 'hidden' }}>
            <div className="vis-med-face">
              <img className="vis-med-img" src={s.thumb} alt={`${s.title} — ${s.place}`} draggable={false} decoding="async"
                style={{ objectPosition: s.thumbFocus, transform: `scale(${s.thumbScale})` }} />
            </div>
            <div className="vis-med-rim" aria-hidden="true" />
          </div>
        ))}
      </div>
    </>
  );
});

function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d={dir < 0 ? 'M13.5 5 7.5 11l6 6' : 'M8.5 5l6 6-6 6'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
