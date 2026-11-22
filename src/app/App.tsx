import { useEffect, useRef } from 'react';
import { store, useUI } from './store';
import { bridge } from './bridge';
import { LoadingScreen } from './ui/LoadingScreen';
import { SelectScreen } from './ui/SelectScreen';
import { Hud } from './ui/Hud';
import { Panels } from './ui/Panels';
import { detectQuality, type QualityLevel } from '../engine/quality';
import { PROFILE } from '../content/profile';

function webgl2Available() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function savedQuality(): QualityLevel {
  try {
    const q = localStorage.getItem('cv.quality');
    if (q === 'high' || q === 'medium' || q === 'low') return q;
  } catch { /* storage unavailable */ }
  return detectQuality();
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useUI((s) => s.phase);
  const flash = useUI((s) => s.flash);

  useEffect(() => {
    if (!webgl2Available()) {
      store.set({ phase: 'error', error: 'This experience needs WebGL 2, which is not available in this browser or on this device.' });
      return;
    }
    let cancelled = false;
    store.set({ phase: 'loading' });
    // The engine (Three.js, VRM, post-processing) is a separate chunk: the loading screen shows instantly.
    import('../game/Game')
      .then(({ Game }) => Game.start(canvasRef.current!, savedQuality()))
      .then((game) => {
        if (cancelled) game.dispose();
        else bridge.game = game;
      })
      .catch((err: unknown) => {
        console.error(err);
        store.set({ phase: 'error', error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
      bridge.game?.dispose();
      bridge.game = null;
    };
  }, []);

  return (
    <div className={`cv-root phase-${phase}`}>
      <canvas ref={canvasRef} className="cv-canvas" aria-label="CYBERVERSE 3D world" tabIndex={0} />
      <div className="cv-flash" style={{ opacity: flash }} aria-hidden="true" />
      {(phase === 'boot' || phase === 'loading') && <LoadingScreen />}
      {phase === 'select' && <SelectScreen />}
      {(phase === 'play' || phase === 'entering') && <Hud />}
      <Panels />
      {phase === 'error' && <ErrorScreen />}
    </div>
  );
}

function ErrorScreen() {
  const error = useUI((s) => s.error);
  return (
    <div className="cv-screen cv-error" role="alert">
      <div className="cv-error-card">
        <p className="cv-kicker">UPLINK FAILED</p>
        <h1>The 3D campus could not start</h1>
        <p>{error}</p>
        <p className="cv-muted">
          You can still reach {PROFILE.name} on <a href={PROFILE.links.github} target="_blank" rel="noreferrer">GitHub</a> or by
          email at <a href={`mailto:${PROFILE.links.email}`}>{PROFILE.links.email}</a>.
        </p>
      </div>
    </div>
  );
}
