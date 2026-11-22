import { useEffect, useRef, useState } from 'react';
import { initRecruiterMotion } from './motion';
import {
  CertificatesSection, ContactSection, EducationSection, ExperienceSection, LanguagesSection, Lightbox, ProfileSection,
  ProjectsSection, ResearchSection, RootMeSection, SkillsSection,
} from '../content/Sections';
import { Visionaries } from './visionaries/Visionaries';

const NAV = [
  ['profile', 'Profile'], ['education', 'Education'], ['experience', 'Experience'], ['projects', 'Projects'], ['research', 'Thesis'],
  ['certificates', 'Certifications'], ['rootme', 'Root-Me'], ['skills', 'Skills'], ['languages', 'Languages'], ['contact', 'Contact'],
] as const;

/** Recruiter Mode: the complete portfolio on one fast page (no 3D engine, no audio). */
export function Recruiter() {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => initRecruiterMotion(pageRef.current!), []);
  return (
    <div className="rc-page" ref={pageRef}>
      <a className="rc-skip" href="#profile">Skip to the portfolio</a>
      <div className="rc-chrome">
        <p className="rc-brand">CYBERVERSE<span> · Recruiter Mode</span></p>
        <a className="rc-switch" href="/?mode=immersive"><span>Immersive </span>3D campus →</a>
      </div>
      <Visionaries />
      <header className="rc-hero">
        <div className="rc-wrap">
          <ProfileSection heading={false} nameAsTitle />
        </div>
      </header>
      <nav className="rc-nav" aria-label="Sections">
        <div className="rc-wrap">
          <span className="rc-nav-ink" aria-hidden="true" />
          {NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </div>
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
    </div>
  );
}
