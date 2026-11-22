import { useEffect, useState } from 'react';
import { bridge } from '../bridge';
import { useUI } from '../store';
import type { QualityLevel } from '../../engine/quality';

export function Hud() {
  const phase = useUI((s) => s.phase);
  const location = useUI((s) => s.location);
  const prompt = useUI((s) => s.prompt);
  const walk = useUI((s) => s.walkMode);
  const locked = useUI((s) => s.pointerLocked);
  const panel = useUI((s) => s.panel);
  const debug = useUI((s) => s.debug);
  const [hintsVisible, setHintsVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setHintsVisible(false), 14000);
    return () => window.clearTimeout(t);
  }, []);

  if (phase !== 'play') return null;
  return (
    <div className="cv-hud">
      <div className="cv-location" aria-live="polite">
        <span className="cv-dot" aria-hidden="true" />
        <span className="cv-mono">{location}</span>
      </div>

      <div className="cv-hud-actions">
        <QualityPicker />
        <button type="button" className="cv-icon-btn" onClick={() => bridge.game?.openPanel('help')} aria-label="Controls and credits">?</button>
      </div>

      {prompt && !panel && (
        <div className="cv-prompt" role="status">
          <kbd>E</kbd>
          <span>{prompt}</span>
        </div>
      )}

      {!locked && !panel && <div className="cv-look-hint">Click the scene to look around with the mouse</div>}

      <div className={`cv-controls ${hintsVisible ? '' : 'is-faded'}`} onMouseEnter={() => setHintsVisible(true)}>
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span>
        <span><kbd>Shift</kbd> sprint</span>
        <span className={walk ? 'is-on' : ''}><kbd>C</kbd> walk {walk ? 'on' : 'off'}</span>
        <span><kbd>Space</kbd> jump</span>
        <span><kbd>E</kbd> interact</span>
        <span><kbd>H</kbd> help</span>
      </div>

      {debug && <DebugOverlay />}
    </div>
  );
}

function QualityPicker() {
  const quality = useUI((s) => s.quality);
  const levels: QualityLevel[] = ['high', 'medium', 'low'];
  return (
    <div className="cv-quality" role="group" aria-label="Graphics quality">
      {levels.map((l) => (
        <button key={l} type="button" className={quality === l ? 'is-active' : ''} aria-pressed={quality === l} onClick={() => bridge.game?.setQuality(l)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function DebugOverlay() {
  const fps = useUI((s) => s.fps);
  const ms = useUI((s) => s.frameMs);
  const calls = useUI((s) => s.drawCalls);
  return (
    <div className="cv-debug cv-mono" aria-hidden="true">
      {fps} fps · {ms} ms · {calls} draw calls
    </div>
  );
}
