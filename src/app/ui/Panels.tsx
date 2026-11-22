import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { bridge } from '../bridge';
import { useUI, type PanelId } from '../store';
import { DISTRICTS } from '../../content/profile';
import { WORLDS, worldIndex } from '../../content/worlds';
import { WorldContent, revealContent, whenSmooth } from '../../content/WorldContent';
import { SITES, siteXZ } from '../../world/campus';
import { prefersReducedMotion } from '../../engine/quality';

/** District terminal → the Recruiter Mode worlds it presents (same words, same typography in both modes). */
const DISTRICT_WORLDS: Partial<Record<Exclude<PanelId, null>, string[]>> = {
  profile: ['profile'],
  academy: ['education', 'languages'],
  soc: ['skills'],
  missions: ['projects', 'experience'],
  research: ['projects'],
  vault: ['certifications', 'rootme'],
  comms: ['contact'],
};

const KICKERS: Record<Exclude<PanelId, null>, string> = {
  profile: 'Main Command Center · operator dossier',
  academy: 'Identity & Academy District',
  soc: 'Security Operations Center',
  missions: 'Project Mission Room',
  research: 'Research Institute',
  vault: 'Digital Proof Vault',
  comms: 'Communication Tower',
  map: 'Sentinel Nexus',
  help: 'Field manual',
};
const TITLES: Partial<Record<Exclude<PanelId, null>, string>> = { map: 'Campus map', help: 'Controls' };

export function Panels() {
  const panel = useUI((s) => s.panel);
  if (!panel) return null;
  const worlds = DISTRICT_WORLDS[panel];
  return (
    <div className={`cv-panel-backdrop${worlds ? ' is-world' : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) bridge.game?.closePanel(); }}>
      {worlds
        ? <WorldPanel key={panel} kicker={KICKERS[panel]} ids={worlds} />
        : <PanelShell kicker={KICKERS[panel]} title={TITLES[panel] ?? ''} wide={panel !== 'help'}>{panel === 'map' ? <CampusMap /> : <Help />}</PanelShell>}
    </div>
  );
}

/**
 * A district terminal opens the same summaries as Recruiter Mode's worlds (side sheet on a computer, full screen
 * on a phone), with the same motion-design reveal; districts presenting two worlds get a tab switch.
 */
function WorldPanel({ kicker, ids }: { kicker: string; ids: string[] }) {
  const [tab, setTab] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const world = WORLDS[worldIndex(ids[tab])];
  useEffect(() => { sheet.current?.focus({ preventScroll: true }); }, []);
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !body.current) return;
    sheet.current?.scrollTo({ top: 0 });
    const tl = revealContent(body.current, 0.05, 1, 1.15).pause();
    tl.progress(0.0001).progress(0);
    const cancel = whenSmooth(() => tl.play(), 250);
    return () => { cancel(); tl.kill(); };
  }, [tab]);
  return (
    <div className="cv-panel is-world" role="dialog" aria-modal="true" aria-labelledby="cv-world-title" tabIndex={-1} ref={sheet}
      style={{ ['--w-accent' as string]: world.accent }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') bridge.game?.closePanel();
        if (ids.length > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) setTab((t) => (t + 1) % ids.length);
      }}>
      <div className="cv-world-head">
        <p className="cv-kicker">{kicker}</p>
        <button type="button" className="cv-icon-btn" onClick={() => bridge.game?.closePanel()} aria-label="Close">×</button>
      </div>
      {ids.length > 1 && (
        <div className="cv-world-tabs" role="tablist" aria-label="Parts presented here">
          {ids.map((id, i) => (
            <button key={id} type="button" role="tab" aria-selected={i === tab} className={i === tab ? 'is-on' : ''} onClick={() => setTab(i)}>
              {WORLDS[worldIndex(id)].title}
            </button>
          ))}
        </div>
      )}
      <div className="cv-world-body" key={world.id} ref={body}>
        <WorldContent world={world} level={2} headingId="cv-world-title" />
      </div>
      <p className="cv-world-foot">
        <button type="button" className="cv-inline-btn" onClick={() => bridge.game?.openPanel('map')}>Campus map (M)</button>
        <a href={`/recruiter/#/${world.id}`}>Open in Recruiter Mode</a>
      </p>
    </div>
  );
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
        <li><span>Phone / tablet</span><span>Left stick to move (light push = walk), drag on the right to look, E / jump / sprint buttons</span></li>
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
