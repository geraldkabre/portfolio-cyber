import { useState } from 'react';
import {
  CertificatesSection, ContactSection, EducationSection, ExperienceSection, LanguagesSection, Lightbox, ProfileSection,
  ProjectsSection, ResearchSection, RootMeSection, SkillsSection,
} from '../content/Sections';

const NAV = [
  ['profile', 'Profile'], ['education', 'Education'], ['experience', 'Experience'], ['projects', 'Projects'], ['research', 'Thesis'],
  ['certificates', 'Certifications'], ['rootme', 'Root-Me'], ['skills', 'Skills'], ['languages', 'Languages'], ['contact', 'Contact'],
] as const;

/** Recruiter Mode: the complete portfolio on one fast page (no 3D engine, no audio). */
export function Recruiter() {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  return (
    <>
      <a className="rc-skip" href="#main">Skip to content</a>
      <header className="rc-hero">
        <div className="rc-wrap">
          <div className="rc-bar">
            <p className="cv-kicker">CYBERVERSE · Recruiter Mode</p>
            <a className="rc-switch" href="/?mode=immersive">Switch to the immersive 3D campus →</a>
          </div>
          <ProfileSection heading={false} />
        </div>
      </header>
      <nav className="rc-nav" aria-label="Sections">
        <div className="rc-wrap">{NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div>
      </nav>
      <main id="main" className="rc-wrap">
        <EducationSection />
        <ExperienceSection />
        <ProjectsSection />
        <ResearchSection onZoom={setZoom} />
        <CertificatesSection onZoom={setZoom} />
        <RootMeSection />
        <SkillsSection />
        <LanguagesSection />
        <ContactSection />
      </main>
      <footer className="rc-footer">
        <div className="rc-wrap">
          <p>CYBERVERSE — The Sentinel Nexus · Recruiter Mode loads no 3D engine and plays no sound.</p>
          <p><a href="/?mode=immersive">Enter the immersive 3D campus</a> · <a href="/">Home</a></p>
        </div>
      </footer>
      <Lightbox item={zoom} onClose={() => setZoom(null)} />
    </>
  );
}
