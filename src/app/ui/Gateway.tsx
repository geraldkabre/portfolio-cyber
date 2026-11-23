import { useEffect, useRef, type CSSProperties } from 'react';
import { PROFILE } from '../../content/profile';
import { FlagBF } from '../../content/Sections';
import './gateway.css';

const V = '/assets/visionaries';
/** Three worlds of the ring, orbiting slowly on the Recruiter Mode card. */
const RING = ['education', 'projects', 'certifications'];

/**
 * First screen: the visitor chooses between Recruiter Mode and the immersive 3D campus. Same slow-motion design as
 * Recruiter Mode: a drifting scene behind, a giant word, the name rising line by line out of a blur, glass discs.
 * CSS animations only (transform / opacity), plus a light pointer parallax on precise pointers.
 */
export function Gateway({ onImmersive }: { onImmersive: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; let tx = 0; let ty = 0; let x = 0; let y = 0;
    const tick = () => {
      x += (tx - x) * 0.04; y += (ty - y) * 0.04; // slow follow: the scene glides, it never snaps
      root.style.setProperty('--gx', x.toFixed(4));
      root.style.setProperty('--gy', y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const [first, ...rest] = PROFILE.name.split(' ');
  const last = rest.join(' ');
  return (
    <div ref={rootRef} className="cv-screen cv-gateway">
      <div className="gw-bg" aria-hidden="true"><div className="gw-bg-img" style={{ backgroundImage: `url("${V}/profile.jpg")` }} /></div>
      <div className="gw-shade" aria-hidden="true" />
      <p className="gw-word" aria-hidden="true">{last.toUpperCase()}</p>
      <div className="gw-pool" aria-hidden="true" />

      <div className="cv-gateway-inner">
        <p className="cv-kicker gw-in" style={{ '--d': '0.2s' } as CSSProperties}>CYBERVERSE · The Sentinel Nexus</p>
        <h1 className="cv-title gw-name" aria-label={PROFILE.name}>
          <span className="gw-line" style={{ '--d': '0.45s' } as CSSProperties} aria-hidden="true">{first}</span>
          <span className="gw-line is-soft" style={{ '--d': '0.75s' } as CSSProperties} aria-hidden="true">{last}</span>
        </h1>
        <p className="cv-gateway-role gw-in" style={{ '--d': '1.25s' } as CSSProperties}>
          {PROFILE.summary} <span className="cv-gateway-place">{PROFILE.location} <FlagBF size={14} /></span>
        </p>
        <p className="cv-gateway-ask gw-in" style={{ '--d': '1.55s' } as CSSProperties}>How would you like to view the portfolio?</p>

        <div className="cv-modes">
          <a className="cv-mode gw-card" href="/recruiter/" style={{ '--d': '1.8s' } as CSSProperties}>
            <span className="gw-orbit" aria-hidden="true">
              {RING.map((id, i) => (
                <span key={id} className="gw-disc is-small" style={{ '--i': i } as CSSProperties}>
                  <img src={`${V}/${id}-thumb.jpg`} alt="" decoding="async" draggable={false} />
                </span>
              ))}
            </span>
            <span className="cv-mode-tag">Recruiter Mode</span>
            <strong>The portfolio, straight away.</strong>
            <span>
              Nine short worlds on a ring of glass: profile, education, experience, projects, certifications, Root-Me,
              skills, languages and contact. Tap one for its summary; every detail is one click away on GitHub. No 3D,
              no sound, made for phones too.
            </span>
            <em>About a minute <i aria-hidden="true">→</i></em>
          </a>
          <button type="button" className="cv-mode is-immersive gw-card" onClick={onImmersive} style={{ '--d': '2.05s' } as CSSProperties}>
            <span className="gw-disc is-big" aria-hidden="true">
              <img src={`${V}/profile-thumb.jpg`} alt="" decoding="async" draggable={false} />
            </span>
            <span className="cv-mode-tag">Immersive Mode</span>
            <strong>Walk the 3D campus.</strong>
            <span>
              Choose an operator and explore the Sentinel Nexus: seven districts, the same summaries as Recruiter Mode,
              a map for fast travel and a chill soundtrack. Keyboard and mouse on a computer, touch controls on phones.
            </span>
            <em>About 15 MB · sound on <i aria-hidden="true">→</i></em>
          </button>
        </div>
      </div>
    </div>
  );
}
