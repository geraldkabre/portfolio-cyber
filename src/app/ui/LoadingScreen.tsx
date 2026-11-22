import { useUI } from '../store';

export function LoadingScreen() {
  const progress = useUI((s) => s.progress);
  const label = useUI((s) => s.progressLabel);
  const pct = Math.round(progress * 100);
  return (
    <div className="cv-screen cv-loading" role="status" aria-live="polite">
      <div className="cv-loading-inner">
        <div className="cv-emblem" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="none" stroke="currentColor" strokeWidth="2" />
            <polygon points="60,24 91,42 91,78 60,96 29,78 29,42" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <path d="M60 40 L78 50 L78 70 L60 80 L42 70 L42 50 Z" fill="currentColor" opacity="0.18" />
            <circle cx="60" cy="60" r="6" fill="currentColor" />
          </svg>
        </div>
        <p className="cv-kicker">CYBERVERSE</p>
        <h1 className="cv-title">The Sentinel Nexus</h1>
        <div className="cv-progress" aria-hidden="true">
          <div className="cv-progress-bar" style={{ transform: `scaleX(${Math.max(0.02, progress)})` }} />
        </div>
        <p className="cv-status">
          <span>{label || 'Establishing secure uplink'}</span>
          <span className="cv-mono">{pct}%</span>
        </p>
      </div>
    </div>
  );
}
