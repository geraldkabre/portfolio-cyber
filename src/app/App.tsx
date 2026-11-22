import { useCallback, useEffect, useRef } from 'react';
import { store, useUI } from './store';
import { bridge } from './bridge';
import { LoadingScreen } from './ui/LoadingScreen';
import { SelectScreen } from './ui/SelectScreen';
import { Hud } from './ui/Hud';
import { Panels } from './ui/Panels';
import { Gateway } from './ui/Gateway';
import { detectQuality, type QualityLevel } from '../engine/quality';
import { PROFILE } from '../content/profile';
import { ambient } from '../audio/AmbientMusic';

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
  const started = useRef(false);
  const phase = useUI((s) => s.phase);
  const flash = useUI((s) => s.flash);

  /** Immersive Mode: loads the engine (separate chunk) only when the visitor asks for it. */
  const startImmersive = useCallback((fromGesture: boolean) => {
    if (started.current) return;
    started.current = true;
    if (!webgl2Available()) {
      store.set({ phase: 'error', error: 'This experience needs WebGL 2, which is not available in this browser or on this device.' });
      return;
    }
    if (fromGesture && ambient.settings.music) ambient.start(); // browsers only allow audio after a user gesture
    store.set({ phase: 'loading' });
    import('../game/Game')
      .then(({ Game }) => Game.start(canvasRef.current!, savedQuality()))
      .then((game) => { bridge.game = game; })
      .catch((err: unknown) => {
        console.error(err);
        store.set({ phase: 'error', error: err instanceof Error ? err.message : String(err) });
      });
  }, []);

  useEffect(() => {
    // Deep link from Recruiter Mode: /?mode=immersive skips the gateway (music starts on the first interaction).
    if (new URLSearchParams(location.search).get('mode') === 'immersive') startImmersive(false);
    return () => { bridge.game?.dispose(); bridge.game = null; };
  }, [startImmersive]);

  return (
    <div className={`cv-root phase-${phase}`}>
      <canvas ref={canvasRef} className="cv-canvas" aria-label="CYBERVERSE 3D world" tabIndex={0} />
      <div className="cv-flash" style={{ opacity: flash }} aria-hidden="true" />
      {phase === 'gateway' && <Gateway onImmersive={() => startImmersive(true)} />}
      {(phase === 'boot' || phase === 'loading') && <LoadingScreen />}
      {/* The selection screen fades out while the camera swings behind the operator (no abrupt cut). */}
      {(phase === 'select' || phase === 'entering') && <SelectScreen leaving={phase === 'entering'} />}
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
          The whole portfolio is available in <a href="/recruiter/">Recruiter Mode</a> (no 3D required), and on{' '}
          <a href={PROFILE.links.github} target="_blank" rel="noreferrer">GitHub</a>.
        </p>
      </div>
    </div>
  );
}
