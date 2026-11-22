import { useEffect, useRef } from 'react';
import { bridge } from '../bridge';
import { useUI } from '../store';
import { DISTRICTS, EDUCATION, HIGHLIGHTS, PROFILE } from '../../content/profile';

export function Panels() {
  const panel = useUI((s) => s.panel);
  if (!panel) return null;
  return (
    <div className="cv-panel-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) bridge.game?.closePanel(); }}>
      {panel === 'dossier' && <Dossier />}
      {panel === 'brief' && <Brief />}
      {panel === 'help' && <Help />}
    </div>
  );
}

function PanelShell({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="cv-panel" role="dialog" aria-modal="true" aria-labelledby="cv-panel-title" tabIndex={-1} ref={ref}
      onKeyDown={(e) => { if (e.key === 'Escape') bridge.game?.closePanel(); }}>
      <div className="cv-panel-head">
        <div>
          <p className="cv-kicker">{kicker}</p>
          <h2 id="cv-panel-title">{title}</h2>
        </div>
        <button type="button" className="cv-icon-btn" onClick={() => bridge.game?.closePanel()} aria-label="Close">×</button>
      </div>
      <div className="cv-panel-body">{children}</div>
    </div>
  );
}

function Dossier() {
  return (
    <PanelShell kicker="OPERATOR DOSSIER · COMMAND CENTER" title={PROFILE.name}>
      <p className="cv-lead">{PROFILE.title} · {PROFILE.focus}</p>
      <dl className="cv-facts">
        <div><dt>Based in</dt><dd>{PROFILE.location}</dd></div>
        <div><dt>Languages</dt><dd>{PROFILE.languages.join(' · ')}</dd></div>
      </dl>
      <h3>Verified records</h3>
      <ul className="cv-list">
        {HIGHLIGHTS.map((h) => <li key={h.label}><strong>{h.label}</strong><span>{h.detail}</span></li>)}
      </ul>
      <h3>Campus status</h3>
      <ul className="cv-districts">
        {DISTRICTS.map((d) => (
          <li key={d.id}>
            <span className={`cv-pill ${d.status}`}>{d.status === 'online' ? 'Online' : 'Under construction'}</span>
            <span><strong>{d.name}</strong> <em>{d.role}</em></span>
          </li>
        ))}
      </ul>
      <div className="cv-links">
        <a href={PROFILE.links.github} target="_blank" rel="noreferrer">GitHub</a>
        <a href={PROFILE.links.rootme} target="_blank" rel="noreferrer">Root-Me</a>
        <a href={`mailto:${PROFILE.links.email}`}>{PROFILE.links.email}</a>
      </div>
    </PanelShell>
  );
}

function Brief() {
  return (
    <PanelShell kicker="DISTRICT BRIEF · ACADEMY OUTPOST" title="Identity & Academy District">
      <p className="cv-lead"><span className="cv-pill construction">Under construction</span> The full district opens in a later milestone. Education on record:</p>
      <ul className="cv-list">
        {EDUCATION.map((e) => <li key={e.title}><strong>{e.title}</strong><span>{e.school}</span></li>)}
      </ul>
      <p className="cv-muted">Walk back through the portal to return to the Command Center.</p>
    </PanelShell>
  );
}

function Help() {
  return (
    <PanelShell kicker="FIELD MANUAL" title="Controls">
      <ul className="cv-keys">
        <li><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows</span><span>Move (relative to the camera)</span></li>
        <li><span>Mouse</span><span>Look around (click the scene first; Esc releases the mouse)</span></li>
        <li><span>Mouse wheel</span><span>Camera distance</span></li>
        <li><span><kbd>Shift</kbd></span><span>Sprint</span></li>
        <li><span><kbd>C</kbd></span><span>Walk mode on / off</span></li>
        <li><span><kbd>Space</kbd></span><span>Jump</span></li>
        <li><span><kbd>E</kbd></span><span>Interact (dossier, district brief)</span></li>
        <li><span><kbd>F3</kbd></span><span>Performance overlay</span></li>
      </ul>
      <h3>Credits</h3>
      <p className="cv-muted">
        Characters: “NEON FIGHTER +” by Kanato and “Cyber JT” by Jonh Tinoco (VRoid Hub), CYBERVERSE editions.
        Environment kits and animations: Quaternius (CC0). Built with Three.js and three-vrm.
      </p>
    </PanelShell>
  );
}
