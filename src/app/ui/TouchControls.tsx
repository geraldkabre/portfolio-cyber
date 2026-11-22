import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { bridge } from '../bridge';
import { useUI } from '../store';

const RADIUS = 56;

/**
 * Touch controls (phones / tablets): analog virtual stick on the left (light push = walk, full push = run),
 * camera drag on the right half, and buttons for interact, jump, sprint and the campus map.
 */
export function TouchControls() {
  const prompt = useUI((s) => s.prompt);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [sprint, setSprint] = useState(false);
  const stickId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);

  const moveStick = (e: RPointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    setKnob({ x: dx, y: dy });
    bridge.game?.touch({ x: dx / RADIUS, y: -dy / RADIUS });
  };
  const releaseStick = () => {
    stickId.current = null;
    setKnob({ x: 0, y: 0 });
    bridge.game?.touch({ x: 0, y: 0 });
  };

  return (
    <div className="cv-touch">
      <div
        className="cv-lookpad"
        aria-hidden="true"
        onPointerDown={(e) => { lookId.current = e.pointerId; last.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          bridge.game?.touch(null, { dx: e.clientX - last.current.x, dy: e.clientY - last.current.y });
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => { lookId.current = null; }}
        onPointerCancel={() => { lookId.current = null; }}
      />
      <div
        ref={base}
        className="cv-stick"
        role="application"
        aria-label="Movement stick"
        onPointerDown={(e) => { stickId.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); moveStick(e); }}
        onPointerMove={(e) => { if (stickId.current === e.pointerId) moveStick(e); }}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
      >
        <span className="cv-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="cv-touch-buttons">
        <button type="button" className={`cv-tbtn ${prompt ? 'is-ready' : ''}`} onClick={() => bridge.game?.interact()} aria-label="Interact">E</button>
        <button type="button" className="cv-tbtn" onClick={() => bridge.game?.jump()} aria-label="Jump">⤒</button>
        <button type="button" className={`cv-tbtn ${sprint ? 'is-ready' : ''}`} aria-pressed={sprint} aria-label="Sprint"
          onClick={() => { const s = !sprint; setSprint(s); bridge.game?.touch(null, undefined, s); }}>»</button>
      </div>
    </div>
  );
}
