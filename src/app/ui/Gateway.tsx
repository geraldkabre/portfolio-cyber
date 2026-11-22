import { PROFILE } from '../../content/profile';
import { FlagBF } from '../../content/Sections';

/** First screen: the visitor chooses between Recruiter Mode and the immersive 3D campus. */
export function Gateway({ onImmersive }: { onImmersive: () => void }) {
  return (
    <div className="cv-screen cv-gateway">
      <div className="cv-gateway-inner">
        <p className="cv-kicker">CYBERVERSE · The Sentinel Nexus</p>
        <h1 className="cv-title">{PROFILE.name}</h1>
        <p className="cv-gateway-role">{PROFILE.title} · {PROFILE.focus} · {PROFILE.location} <FlagBF size={14} /></p>
        <p className="cv-gateway-ask">How would you like to view the portfolio?</p>
        <div className="cv-modes">
          <a className="cv-mode" href="/recruiter/">
            <span className="cv-mode-tag">Recruiter Mode</span>
            <strong>The complete portfolio, straight away</strong>
            <span>
              One fast, readable page — profile, education, experience, projects, certifications, Root-Me write-ups,
              skills, languages and contact, each with its GitHub link. No 3D, no sound, no map to cross; works on any
              device.
            </span>
            <em>About 2 minutes to read →</em>
          </a>
          <button type="button" className="cv-mode is-immersive" onClick={onImmersive}>
            <span className="cv-mode-tag">Immersive Mode</span>
            <strong>Explore the 3D cybersecurity campus</strong>
            <span>
              Choose an operator and walk through the Sentinel Nexus: seven districts, each presenting one part of the
              portfolio, with a campus map for fast travel and a chill ambient soundtrack. Keyboard and mouse on a
              computer, touch controls on phones and tablets.
            </span>
            <em>About 15 MB to load · sound on →</em>
          </button>
        </div>
      </div>
    </div>
  );
}
