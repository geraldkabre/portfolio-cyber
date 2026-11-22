import { useEffect, useRef, useState, type ReactNode } from 'react';
import { bridge } from '../bridge';
import { useUI, type PanelId } from '../store';
import { DISTRICTS, GITHUB } from '../../content/profile';
import {
  CertificatesSection, ContactSection, EducationSection, ExperienceSection, LanguagesSection, Lightbox, ProfileSection,
  ProjectsSection, ResearchSection, RootMeSection, SkillsSection, type Zoom,
} from '../../content/Sections';
import { SITES, siteXZ } from '../../world/campus';

const TITLES: Record<Exclude<PanelId, null>, [string, string]> = {
  profile: ['MAIN COMMAND CENTER · OPERATOR DOSSIER', 'Profile'],
  academy: ['IDENTITY & ACADEMY DISTRICT', 'Education & languages'],
  soc: ['SECURITY OPERATIONS CENTER', 'Skills'],
  missions: ['PROJECT MISSION ROOM', 'Projects & experience'],
  research: ['RESEARCH INSTITUTE', 'pfSense thesis'],
  vault: ['DIGITAL PROOF VAULT', 'Certifications & Root-Me'],
  comms: ['COMMUNICATION TOWER', 'Contact'],
  map: ['SENTINEL NEXUS', 'Campus map'],
  help: ['FIELD MANUAL', 'Controls'],
};

export function Panels() {
  const panel = useUI((s) => s.panel);
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  if (!panel) return null;
  const [kicker, title] = TITLES[panel];
  return (
    <div className="cv-panel-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) bridge.game?.closePanel(); }}>
      <PanelShell kicker={kicker} title={title} wide={panel !== 'help'}>
        <PanelBody panel={panel} onZoom={setZoom} />
      </PanelShell>
      <Lightbox item={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}

function PanelBody({ panel, onZoom }: { panel: Exclude<PanelId, null>; onZoom: Zoom }) {
  switch (panel) {
    case 'profile':
      return (
        <>
          <ProfileSection heading={false} />
          <p className="sec-actions">
            <button type="button" className="cv-inline-btn" onClick={() => bridge.game?.openPanel('map')}>Open the campus map (M)</button>
            <a href="/recruiter/">Recruiter Mode (one page)</a>
          </p>
        </>
      );
    case 'academy': return <><EducationSection /><LanguagesSection /></>;
    case 'soc': return <SkillsSection />;
    case 'missions': return <><ProjectsSection /><ExperienceSection /></>;
    case 'research': return <ResearchSection onZoom={onZoom} />;
    case 'vault': return <><CertificatesSection onZoom={onZoom} /><RootMeSection /></>;
    case 'comms': return <><ContactSection /><p className="sec-actions"><a href="/recruiter/">Recruiter Mode — the whole portfolio on one page</a><a href={GITHUB.repository} target="_blank" rel="noreferrer">Portfolio repository ↗</a></p></>;
    case 'map': return <CampusMap />;
    case 'help': return <Help />;
  }
}

function PanelShell({ kicker, title, wide, children }: { kicker: string; title: string; wide: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className={`cv-panel ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="cv-panel-title" tabIndex={-1} ref={ref}
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

/** Campus map: every district, what it presents, where the operator is, and one-click fast travel. */
function CampusMap() {
  const here = useUI((s) => s.district);
  const R = 230, C = 300, maxDist = Math.max(...SITES.map((s) => s.dist));
  const nodes = SITES.map((s) => {
    const p = siteXZ(s.az, s.dist);
    const info = DISTRICTS.find((d) => d.id === s.id)!;
    return { ...s, info, x: C + (p.x / maxDist) * R, y: C + (p.z / maxDist) * R };
  });
  const travel = (id: string) => bridge.game?.travel(id);
  return (
    <div className="cv-map">
      <svg viewBox="0 0 600 600" className="cv-map-svg" role="img" aria-label="Map of the Sentinel Nexus campus">
        <defs>
          <radialGradient id="mapGlow"><stop offset="0" stopColor="#00e5ff" stopOpacity="0.35" /><stop offset="1" stopColor="#00e5ff" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx={C} cy={C} r={R + 40} fill="none" stroke="rgba(120,210,255,0.12)" />
        <circle cx={C} cy={C} r={R / 2} fill="none" stroke="rgba(120,210,255,0.08)" strokeDasharray="4 6" />
        {nodes.map((n) => <line key={`l-${n.id}`} x1={C} y1={C} x2={n.x} y2={n.y} stroke={n.color} strokeOpacity="0.45" strokeDasharray="2 5" />)}
        <circle cx={C} cy={C} r="60" fill="url(#mapGlow)" />
        <g className="cv-map-node" onClick={() => travel('command')} role="button" tabIndex={0} aria-label="Travel to the Main Command Center"
          onKeyDown={(e) => { if (e.key === 'Enter') travel('command'); }}>
          <polygon points={hexPoints(C, C, 26)} fill="#0b1326" stroke="#00e5ff" strokeWidth="2" />
          <text x={C} y={C + 4} textAnchor="middle" className="cv-map-label">CC</text>
          <text x={C} y={C + 46} textAnchor="middle" className="cv-map-name">Command Center</text>
          {here === 'command' && <Here x={C} y={C - 38} />}
        </g>
        {nodes.map((n) => (
          <g key={n.id} className="cv-map-node" onClick={() => travel(n.id)} role="button" tabIndex={0} aria-label={`Travel to ${n.info.name}`}
            onKeyDown={(e) => { if (e.key === 'Enter') travel(n.id); }}>
            <polygon points={hexPoints(n.x, n.y, 20)} fill="#0b1326" stroke={n.color} strokeWidth="2" />
            <circle cx={n.x} cy={n.y} r="5" fill={n.color} />
            <text x={n.x} y={n.y + 38} textAnchor="middle" className="cv-map-name">{n.short}</text>
            {here === n.id && <Here x={n.x} y={n.y - 32} />}
          </g>
        ))}
        <text x="20" y="30" className="cv-map-north">N ↑</text>
      </svg>
      <ul className="cv-map-list">
        {DISTRICTS.map((d) => (
          <li key={d.id} className={here === d.id ? 'is-here' : ''}>
            <div>
              <strong>{d.name}</strong>
              <span>{d.role}</span>
            </div>
            <div className="cv-map-actions">
              {here === d.id ? <em>You are here</em> : <button type="button" onClick={() => travel(d.id)}>Travel</button>}
              {d.github && <a href={d.github} target="_blank" rel="noreferrer">GitHub ↗</a>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const hexPoints = (x: number, y: number, r: number) =>
  [0, 1, 2, 3, 4, 5].map((i) => `${(x + r * Math.cos((Math.PI / 3) * i + Math.PI / 6)).toFixed(1)},${(y + r * Math.sin((Math.PI / 3) * i + Math.PI / 6)).toFixed(1)}`).join(' ');

function Here({ x, y }: { x: number; y: number }) {
  return (
    <g className="cv-map-here">
      <path d={`M ${x} ${y + 10} l -7 -12 h 14 z`} fill="#00e5ff" />
      <text x={x} y={y - 6} textAnchor="middle">You are here</text>
    </g>
  );
}

function Help() {
  return (
    <>
      <ul className="cv-keys">
        <li><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> or arrows</span><span>Move (relative to the camera)</span></li>
        <li><span>Mouse</span><span>Look around (click the scene first; Esc releases the mouse)</span></li>
        <li><span>Mouse wheel</span><span>Camera distance</span></li>
        <li><span><kbd>Shift</kbd></span><span>Sprint</span></li>
        <li><span><kbd>C</kbd></span><span>Walk mode on / off</span></li>
        <li><span><kbd>Space</kbd></span><span>Jump</span></li>
        <li><span><kbd>E</kbd></span><span>Interact with a terminal</span></li>
        <li><span><kbd>M</kbd></span><span>Campus map and fast travel</span></li>
        <li><span><kbd>F3</kbd></span><span>Performance overlay</span></li>
      </ul>
      <h3>Credits</h3>
      <p className="cv-muted">
        Characters: “NEON FIGHTER +” by Kanato and “Cyber JT” by Jonh Tinoco (VRoid Hub), CYBERVERSE editions.
        Environment kits and animations: Quaternius (CC0). Music: original generative score, synthesised live in the
        browser. Built with Three.js and three-vrm.
      </p>
    </>
  );
}
