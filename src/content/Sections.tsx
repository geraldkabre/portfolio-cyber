import { useEffect, useRef, type ReactNode } from 'react';
import {
  CERTIFICATES, CERTIFICATE_ISSUER, EDUCATION, EXPERIENCE, GITHUB, LEVEL_VALUE, PROFILE, PROJECTS, RESEARCH, ROOTME,
  ROOTME_METHOD, SKILLS, certificateImage, certificateOnGitHub, rootmeLink,
} from './profile';

/**
 * Portfolio sections shared by Recruiter Mode (one page) and the 3D campus (one district panel each).
 * Every section links to its source page on GitHub.
 */
declare const __HAS_PHOTO__: boolean;

export type Zoom = (item: { src: string; alt: string }) => void;

const ext = { target: '_blank', rel: 'noreferrer' } as const;

function Head({ id, title, github, children }: { id: string; title: string; github?: string; children?: ReactNode }) {
  return (
    <div className="sec-head">
      <h2 id={`h-${id}`}>{title}</h2>
      {children}
      {github && <a className="sec-gh" href={github} {...ext}>View on GitHub ↗</a>}
    </div>
  );
}

/** Flag of Burkina Faso (SVG: emoji flags do not render on Windows). */
export function FlagBF({ size = 18 }: { size?: number }) {
  return (
    <svg className="sec-flag" width={size * 1.5} height={size} viewBox="0 0 30 20" role="img" aria-label="Burkina Faso">
      <rect width="30" height="10" fill="#EF2B2D" />
      <rect y="10" width="30" height="10" fill="#009E49" />
      <polygon fill="#FCD116" points="15,5.6 16.1,8.9 19.6,8.9 16.8,11 17.8,14.3 15,12.3 12.2,14.3 13.2,11 10.4,8.9 13.9,8.9" />
    </svg>
  );
}

export function Avatar({ size = 112 }: { size?: number }) {
  if (__HAS_PHOTO__) return <img className="sec-avatar" src={PROFILE.photo} width={size} height={size} alt={PROFILE.name} />;
  return (
    <div className="sec-avatar sec-monogram" style={{ width: size, height: size }} role="img" aria-label={`${PROFILE.name} (monogram)`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="50" y="58" textAnchor="middle" fontSize="30" fontWeight="600" fill="currentColor" letterSpacing="2">GK</text>
      </svg>
    </div>
  );
}

export function ProfileSection({ heading = true, nameAsTitle = false }: { heading?: boolean; nameAsTitle?: boolean }) {
  const email = PROFILE.links.email;
  const Name = nameAsTitle ? 'h1' : 'p';
  return (
    <section className="sec" id="profile" {...(heading ? { 'aria-labelledby': 'h-profile' } : { 'aria-label': 'Profile' })}>
      {heading && <Head id="profile" title="Profile" github={GITHUB.readme} />}
      <div className="sec-profile">
        <Avatar />
        <div>
          <Name className="sec-name">{PROFILE.name} <FlagBF size={20} /></Name>
          <p className="sec-title">{PROFILE.title} · {PROFILE.focus}</p>
          <p className="sec-dim">{PROFILE.location} · {PROFILE.current}</p>
        </div>
      </div>
      <p className="sec-lead">{PROFILE.summary}</p>
      <div className="sec-links">
        {email && <a href={`mailto:${email}`}>Email</a>}
        <a href={PROFILE.links.github} {...ext}>GitHub</a>
        <a href={PROFILE.links.rootme} {...ext}>Root-Me · {PROFILE.links.rootmeHandle}</a>
        <a href={GITHUB.repository} {...ext}>Portfolio repository</a>
      </div>
    </section>
  );
}

export function EducationSection() {
  return (
    <section className="sec" id="education" aria-labelledby="h-education">
      <Head id="education" title="Education" github={GITHUB.readme} />
      <ol className="sec-timeline">
        {EDUCATION.map((e) => (
          <li key={e.title} className={'current' in e && e.current ? 'is-current' : ''}>
            <span className="sec-period">{e.period}</span>
            <strong>{e.title}</strong>
            <span className="sec-dim">{e.school}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section className="sec" id="experience" aria-labelledby="h-experience">
      <Head id="experience" title="Experience" />
      <div className="sec-cards">
        {EXPERIENCE.map((e) => (
          <article key={e.title} className="sec-card">
            <h3>{e.title}</h3>
            <p>{e.detail}</p>
            <p className="sec-tags">{e.tags.map((t) => <span key={t}>{t}</span>)}</p>
            {'link' in e && e.link && <a className="sec-more" href={e.link} {...ext}>Write-ups on GitHub ↗</a>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProjectsSection() {
  return (
    <section className="sec" id="projects" aria-labelledby="h-projects">
      <Head id="projects" title="Projects" github={GITHUB.projects} />
      <div className="sec-cards">
        {PROJECTS.map((p) => (
          <article key={p.id} className="sec-card">
            <p className={`sec-status ${p.status}`}>{p.status === 'completed' ? 'Completed' : 'In progress'}</p>
            <h3>{p.title}</h3>
            {p.statusNote && <p className="sec-dim">{p.statusNote}</p>}
            <p>{p.summary}</p>
            {p.method && (
              <ol className="sec-method" aria-label="Method">
                {p.method.map((m, i) => <li key={m}><span>Phase {i + 1}</span>{m}</li>)}
              </ol>
            )}
            <p className="sec-tags">{p.highlights.map((h) => <span key={h}>{h}</span>)}</p>
            <p className="sec-actions">{p.links.map((l) => <a key={l.href} href={l.href} {...ext}>{l.label} ↗</a>)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResearchSection({ onZoom }: { onZoom?: Zoom }) {
  return (
    <section className="sec" id="research" aria-labelledby="h-research">
      <Head id="research" title="Thesis in depth" github={GITHUB.thesisPage} />
      <h3 className="sec-subtitle">{RESEARCH.title}</h3>
      <p className="sec-dim">{RESEARCH.caseStudy} · Authors: {RESEARCH.authors}</p>
      <p>{RESEARCH.abstract}</p>
      <div className="sec-figures">
        {RESEARCH.figures.map((f) => (
          <button key={f.src} type="button" className="sec-figure" onClick={() => onZoom?.({ src: f.src, alt: f.caption })}>
            <img src={f.src} alt="" loading="lazy" width={f.w} height={f.h} />
            <span>{f.caption}</span>
          </button>
        ))}
      </div>
      <p className="sec-actions">
        <a href={GITHUB.thesisPdf} {...ext}>Thesis PDF on GitHub ↗</a>
        <a href={RESEARCH.pdf} {...ext}>Open the PDF here</a>
      </p>
    </section>
  );
}

export function CertificatesSection({ onZoom }: { onZoom?: Zoom }) {
  return (
    <section className="sec" id="certificates" aria-labelledby="h-certificates">
      <Head id="certificates" title="Certifications" github={GITHUB.certifications}>
        <p className="sec-dim">{CERTIFICATE_ISSUER} — six course certificates</p>
      </Head>
      <ul className="sec-certs">
        {CERTIFICATES.map((c) => (
          <li key={c.id} className="sec-cert">
            <button type="button" onClick={() => onZoom?.({ src: certificateImage(c.id), alt: `${c.title} — Cisco Networking Academy` })} aria-label={`Enlarge ${c.title}`}>
              <img src={certificateImage(c.id, true)} alt="" loading="lazy" width={260} height={180} />
            </button>
            <strong>{c.title}</strong>
            <span className="sec-dim">{c.focus}</span>
            <a href={certificateOnGitHub(c.id)} {...ext}>Certificate on GitHub ↗</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RootMeSection() {
  return (
    <section className="sec" id="rootme" aria-labelledby="h-rootme">
      <Head id="rootme" title="CTF — Root-Me" github={GITHUB.rootme}>
        <p className="sec-dim">11 documented write-ups · Web-Client, Web-Server, Cryptanalysis · profile <a href={PROFILE.links.rootme} {...ext}>{PROFILE.links.rootmeHandle} ↗</a></p>
      </Head>
      <p className="sec-dim">{ROOTME_METHOD}</p>
      <div className="sec-table-wrap">
        <table className="sec-table">
          <thead><tr><th scope="col">Challenge</th><th scope="col">Category</th><th scope="col">Difficulty</th><th scope="col">Root cause</th></tr></thead>
          <tbody>
            {ROOTME.map((r) => (
              <tr key={r.file}>
                <td><a href={rootmeLink(r.file)} {...ext}>{r.title}</a></td>
                <td>{r.category}</td><td>{r.difficulty}</td><td>{r.vuln}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SkillsSection() {
  return (
    <section className="sec" id="skills" aria-labelledby="h-skills">
      <Head id="skills" title="Skills" github={GITHUB.skills} />
      <h3 className="sec-subtitle">Security</h3>
      <p className="sec-tags">{SKILLS.security.map((s) => <span key={s}>{s}</span>)}</p>
      <h3 className="sec-subtitle">Development</h3>
      <ul className="sec-levels">
        {SKILLS.development.map((d) => (
          <li key={d.name}>
            <span>{d.name}</span>
            <span className="sec-bar" aria-hidden="true"><i style={{ width: `${(LEVEL_VALUE[d.level] ?? 1) * 33 + 8}%` }} /></span>
            <span className="sec-dim">{d.level}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LanguagesSection() {
  return (
    <section className="sec" id="languages" aria-labelledby="h-languages">
      <Head id="languages" title="Languages" />
      <ul className="sec-langs">
        {PROFILE.languages.map((l) => <li key={l.name}><strong>{l.name}</strong><span className="sec-dim">{l.level}</span></li>)}
      </ul>
    </section>
  );
}

export function ContactSection() {
  const email = PROFILE.links.email;
  return (
    <section className="sec" id="contact" aria-labelledby="h-contact">
      <Head id="contact" title="Contact" />
      <ul className="sec-contact">
        {email && <li><span>Email</span><a href={`mailto:${email}`}>{email}</a></li>}
        <li><span>GitHub</span><a href={PROFILE.links.github} {...ext}>github.com/geraldkabre</a></li>
        <li><span>Root-Me</span><a href={PROFILE.links.rootme} {...ext}>{PROFILE.links.rootmeHandle}</a></li>
      </ul>
    </section>
  );
}

export function Lightbox({ item, onClose }: { item: { src: string; alt: string } | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);
  return (
    <dialog ref={ref} className="sec-lightbox" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {item && <figure><img src={item.src} alt={item.alt} /><figcaption>{item.alt}</figcaption></figure>}
      <button type="button" className="sec-close" onClick={onClose} aria-label="Close">×</button>
    </dialog>
  );
}
