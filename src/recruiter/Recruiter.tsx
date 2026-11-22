import { useEffect, useRef, useState } from 'react';
import {
  CERTIFICATES, CERTIFICATE_ISSUER, EDUCATION, EXPERIENCE, PROFILE, PROJECTS, RESEARCH, ROOTME, ROOTME_METHOD, SKILLS,
  certificateImage, rootmeLink,
} from '../content/profile';

declare const __HAS_PHOTO__: boolean;

const SECTIONS = [
  ['about', 'Profile'], ['education', 'Education'], ['skills', 'Skills'], ['projects', 'Projects'], ['experience', 'Experience'],
  ['certificates', 'Certificates'], ['research', 'Research'], ['rootme', 'Root-Me'], ['contact', 'Contact'],
] as const;

export function Avatar({ size = 112 }: { size?: number }) {
  if (__HAS_PHOTO__) return <img className="rc-avatar" src={PROFILE.photo} width={size} height={size} alt={PROFILE.name} />;
  return (
    <div className="rc-avatar rc-monogram" style={{ width: size, height: size }} role="img" aria-label={`${PROFILE.name} (monogram)`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="50" y="58" textAnchor="middle" fontSize="30" fontWeight="600" fill="currentColor" letterSpacing="2">GK</text>
      </svg>
    </div>
  );
}

function Lightbox({ item, onClose }: { item: { src: string; alt: string } | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);
  return (
    <dialog ref={ref} className="rc-lightbox" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {item && (
        <figure>
          <img src={item.src} alt={item.alt} />
          <figcaption>{item.alt}</figcaption>
        </figure>
      )}
      <button type="button" className="rc-close" onClick={onClose} aria-label="Close">×</button>
    </dialog>
  );
}

export function Recruiter() {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const email = PROFILE.links.email;
  return (
    <>
      <a className="rc-skip" href="#main">Skip to content</a>
      <header className="rc-hero">
        <div className="rc-wrap rc-hero-inner">
          <Avatar />
          <div className="rc-hero-text">
            <p className="cv-kicker">CYBERVERSE · Recruiter Mode</p>
            <h1>{PROFILE.name}</h1>
            <p className="rc-role">{PROFILE.title} — {PROFILE.focus}</p>
            <p className="rc-meta">
              {PROFILE.location} · {PROFILE.languages.filter((l) => l.name !== 'Mandarin').map((l) => `${l.name} (${l.level})`).join(' · ')}
            </p>
            <div className="rc-actions">
              <a className="rc-btn rc-primary" href={PROFILE.cv} download>Download CV (PDF)</a>
              {email && <a className="rc-btn" href={`mailto:${email}`}>Email</a>}
              <a className="rc-btn" href={PROFILE.links.github} target="_blank" rel="noreferrer">GitHub</a>
              <a className="rc-btn" href={PROFILE.links.rootme} target="_blank" rel="noreferrer">Root-Me</a>
              <a className="rc-btn rc-ghost rc-screen-only" href="/">Explore the 3D campus →</a>
            </div>
            <p className="rc-print-only rc-print-contact">
              {email && <>{email} · </>}github.com/geraldkabre · root-me.org/godboy
            </p>
          </div>
        </div>
      </header>

      <nav className="rc-nav" aria-label="Sections">
        <div className="rc-wrap">
          {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </div>
      </nav>

      <main id="main" className="rc-wrap">
        <section id="about" aria-labelledby="h-about">
          <h2 id="h-about">Profile</h2>
          <p className="rc-lead">{PROFILE.summary}</p>
          <ul className="rc-stats" aria-label="Key figures">
            <li><strong>1</strong><span>co-authored thesis, defended</span></li>
            <li><strong>6</strong><span>Cisco NetAcad course certificates</span></li>
            <li><strong>11</strong><span>Root-Me write-ups</span></li>
            <li><strong>3</strong><span>languages: French, English, Mandarin</span></li>
          </ul>
        </section>

        <section id="education" aria-labelledby="h-education">
          <h2 id="h-education">Education</h2>
          <ul className="rc-timeline">
            {EDUCATION.map((e) => <li key={e.title}><strong>{e.title}</strong><span>{e.school}</span></li>)}
          </ul>
          <p className="rc-note">Languages: {PROFILE.languages.map((l) => `${l.name} — ${l.level}`).join(' · ')}</p>
        </section>

        <section id="skills" aria-labelledby="h-skills">
          <h2 id="h-skills">Skills</h2>
          <div className="rc-skills">
            {SKILLS.map((s) => (
              <div key={s.area} className="rc-skill">
                <h3>{s.area}</h3>
                <ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section id="projects" aria-labelledby="h-projects">
          <h2 id="h-projects">Projects</h2>
          <div className="rc-cards">
            {PROJECTS.map((p) => (
              <article key={p.id} className="rc-card">
                <p className="rc-card-top">
                  <span className={`rc-status ${p.status}`}>{p.status === 'completed' ? 'Completed' : 'In progress'}</span>
                  <span className="rc-domain">{p.domain}</span>
                </p>
                <h3>{p.title}</h3>
                {p.statusNote && <p className="rc-note">{p.statusNote}</p>}
                <p>{p.summary}</p>
                <ul>{p.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                {p.tech.length > 0 && <p className="rc-tags">{p.tech.map((t) => <span key={t}>{t}</span>)}</p>}
                {p.link && <a className="rc-link rc-screen-only" href={p.link} target="_blank" rel="noreferrer">Project documentation →</a>}
              </article>
            ))}
          </div>
        </section>

        <section id="experience" aria-labelledby="h-experience">
          <h2 id="h-experience">Experience &amp; training</h2>
          <ul className="rc-timeline">
            {EXPERIENCE.map((e) => <li key={e.title}><strong>{e.title}</strong><span>{e.detail}</span></li>)}
          </ul>
        </section>

        <section id="certificates" aria-labelledby="h-certificates">
          <h2 id="h-certificates">Certificates</h2>
          <p className="rc-note">{CERTIFICATE_ISSUER} — Junior Cybersecurity Analyst career path.</p>
          <p className="rc-print-only">{CERTIFICATES.map((c) => c.title).join(' · ')}</p>
          <ul className="rc-certs rc-screen-only">
            {CERTIFICATES.map((c) => (
              <li key={c.id}>
                <button type="button" className="rc-cert" onClick={() => setZoom({ src: certificateImage(c.id), alt: `${c.title} — certificate of course completion` })}>
                  <img src={certificateImage(c.id, true)} alt="" loading="lazy" width={260} height={180} />
                  <strong>{c.title}</strong>
                  <span>{c.focus}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section id="research" aria-labelledby="h-research">
          <h2 id="h-research">Research</h2>
          <article className="rc-research">
            <h3>{RESEARCH.title}</h3>
            <p className="rc-note">{RESEARCH.caseStudy} · {RESEARCH.institution}</p>
            <p className="rc-note">Authors: {RESEARCH.authors} · {RESEARCH.defended}</p>
            <p>{RESEARCH.abstract}</p>
            <div className="rc-figures rc-screen-only">
              {RESEARCH.figures.map((f) => (
                <button key={f.src} type="button" className="rc-figure" onClick={() => setZoom({ src: f.src, alt: f.caption })}>
                  <img src={f.src} alt="" loading="lazy" />
                  <span>{f.caption}</span>
                </button>
              ))}
            </div>
            <h4>Validation tests</h4>
            <ol className="rc-tests">{RESEARCH.tests.map((t) => <li key={t}>{t}</li>)}</ol>
            <div className="rc-screen-only">
              <h4>Future work</h4>
              <ul>{RESEARCH.future.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <a className="rc-btn rc-screen-only" href={RESEARCH.pdf} target="_blank" rel="noreferrer">Read the full thesis (PDF, French)</a>
          </article>
        </section>

        <section id="rootme" aria-labelledby="h-rootme">
          <h2 id="h-rootme">Root-Me write-ups</h2>
          <p className="rc-note">{ROOTME_METHOD}</p>
          <p className="rc-print-only">{ROOTME.map((r) => r.title).join(' · ')}</p>
          <div className="rc-table-wrap rc-screen-only">
            <table className="rc-table">
              <thead><tr><th scope="col">Challenge</th><th scope="col">Category</th><th scope="col">Difficulty</th><th scope="col">Root cause</th></tr></thead>
              <tbody>
                {ROOTME.map((r) => (
                  <tr key={r.file}>
                    <td><a href={rootmeLink(r.file)} target="_blank" rel="noreferrer">{r.title}</a></td>
                    <td>{r.category}</td><td>{r.difficulty}</td><td>{r.vuln}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="contact" aria-labelledby="h-contact">
          <h2 id="h-contact">Contact</h2>
          <ul className="rc-contact">
            {email && <li><span>Email</span><a href={`mailto:${email}`}>{email}</a></li>}
            <li><span>GitHub</span><a href={PROFILE.links.github} target="_blank" rel="noreferrer">github.com/geraldkabre</a></li>
            <li><span>Root-Me</span><a href={PROFILE.links.rootme} target="_blank" rel="noreferrer">root-me.org/godboy</a></li>
            <li className="rc-screen-only"><span>CV</span><a href={PROFILE.cv} download>Gerald-Kabre-CV.pdf</a></li>
          </ul>
        </section>
      </main>

      <footer className="rc-footer rc-screen-only">
        <div className="rc-wrap">
          <p>CYBERVERSE — The Sentinel Nexus · Recruiter Mode loads no 3D engine and plays no sound.</p>
          <p><a href="/">Enter the 3D campus</a> · <button type="button" className="rc-linkbtn" onClick={() => window.print()}>Print this page</button></p>
        </div>
      </footer>
      <Lightbox item={zoom} onClose={() => setZoom(null)} />
    </>
  );
}
