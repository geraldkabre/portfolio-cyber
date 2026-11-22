import { PROFILE } from '../../content/profile';
import { FlagBF } from '../../content/Sections';

/** First screen: the visitor chooses between Recruiter Mode and the immersive 3D campus. */
export function Gateway({ onImmersive }: { onImmersive: () => void }) {
  return (
    <div className="cv-screen cv-gateway">
      <div className="cv-gateway-inner">
        <p className="cv-kicker">CYBERVERSE · The Sentinel Nexus</p>
        <h1 className="cv-title">{PROFILE.name}</h1>
        <p className="cv-gateway-role">{PROFILE.summary} <span className="cv-gateway-place">{PROFILE.location} <FlagBF size={14} /></span></p>
        <p className="cv-gateway-ask">How would you like to view the portfolio?</p>
        <div className="cv-modes">
          <a className="cv-mode" href="/recruiter/">
            <span className="cv-mode-tag">Recruiter Mode</span>
            <strong>The portfolio, straight away.</strong>
            <span>
              Nine short worlds on a ring of glass: profile, education, experience, projects, certifications, Root-Me,
              skills, languages and contact. Tap one for its summary; every detail is one click away on GitHub. No 3D,
              no sound — made for phones too.
            </span>
            <em>About a minute →</em>
          </a>
          <button type="button" className="cv-mode is-immersive" onClick={onImmersive}>
            <span className="cv-mode-tag">Immersive Mode</span>
            <strong>Walk the 3D campus.</strong>
            <span>
              Choose an operator and explore the Sentinel Nexus: seven districts, the same summaries as Recruiter Mode,
              a map for fast travel and a chill soundtrack. Keyboard and mouse on a computer, touch controls on phones.
            </span>
            <em>About 15 MB · sound on →</em>
          </button>
        </div>
      </div>
    </div>
  );
}
