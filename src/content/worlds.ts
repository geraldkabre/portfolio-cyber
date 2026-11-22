/**
 * Recruiter Mode — the nine "worlds": a short, factual summary per part of the portfolio. Every detail lives on
 * GitHub (each world's main button). Facts come only from src/content/profile.ts (owner's notes) and the thesis page.
 */
import {
  CERTIFICATES, EDUCATION, EXPERIENCE, GITHUB, PROFILE, PROJECTS, ROOTME, SKILLS, certificateImage, certificateOnGitHub,
} from './profile';
import { SCENES } from '../recruiter/visionaries/scenes';

export interface WorldStat { value: number; label: string; suffix?: string }
export interface WorldItem { label: string; meta?: string; href?: string; status?: 'completed' | 'in-progress' }
export interface WorldLink { label: string; href: string }

export interface World {
  id: string;
  /** Giant background word (decorative). */
  word: string;
  title: string;
  /** Headline, one entry per line. */
  headline: string[];
  lead: string;
  meta?: string;
  stats: WorldStat[];
  items?: WorldItem[];
  chips?: { title: string; list: readonly string[] }[];
  thumbs?: { src: string; href: string; alt: string }[];
  /** Main action: the full details on GitHub (or the e-mail for Contact). */
  cta: WorldLink;
  links?: WorldLink[];
  image: string;
  imageFocus: string;
  /** Use the profile photo as the visual. */
  photo?: boolean;
  accent: string;
}

const email = PROFILE.links.email;
const scene = (id: string) => SCENES.find((s) => s.id === id)!;
const visual = (id: string) => ({ image: scene(id).image, imageFocus: scene(id).thumbFocus, accent: scene(id).accent });
const completed = PROJECTS.filter((p) => p.status === 'completed').length;
const inProgress = PROJECTS.length - completed;

export const WORLDS: World[] = [
  {
    id: 'profile', word: 'KABRÉ', title: 'Profile', ...visual('profile'), photo: true,
    headline: ['Gérald', 'Kabré.'],
    lead: PROFILE.summary,
    meta: `${PROFILE.location} · learning Mandarin in Qingdao, China`,
    stats: [
      { value: CERTIFICATES.length, label: 'Cisco certificates' },
      { value: ROOTME.length, label: 'Root-Me write-ups' },
      { value: completed, label: 'thesis completed' },
    ],
    cta: { label: 'GitHub profile', href: GITHUB.profile },
    links: [
      { label: `Root-Me · ${PROFILE.links.rootmeHandle}`, href: PROFILE.links.rootme },
      ...(email ? [{ label: 'E-mail', href: `mailto:${email}` }] : []),
    ],
  },
  {
    id: 'education', word: 'STUDY', title: 'Education', ...visual('education'),
    headline: ['Three years', 'of engineering.'],
    lead: 'Bachelor of Engineering in cybersecurity at Dadoh University, after preparatory classes at 2iE. Now learning Mandarin in China.',
    stats: [{ value: 2026, label: 'Bachelor of Engineering' }, { value: 3, label: 'years of engineering studies' }],
    items: EDUCATION.map((e) => ({ label: e.title, meta: `${e.period} · ${e.school}` })),
    cta: { label: 'Details on GitHub', href: GITHUB.readme },
  },
  {
    id: 'experience', word: 'BUILD', title: 'Experience', ...visual('experience'),
    headline: ['Learned', 'by building.'],
    lead: 'An intensive development programme, a deployed web application and regular security practice.',
    stats: [{ value: 3, label: 'months at Switch Maker' }, { value: ROOTME.length, label: 'challenges written up' }],
    items: EXPERIENCE.map((e) => ({ label: e.title, meta: e.tags.join(' · ') })),
    cta: { label: 'Details on GitHub', href: GITHUB.repository },
  },
  {
    id: 'projects', word: 'SECURE', title: 'Projects', ...visual('projects'),
    headline: ['One network,', 'rebuilt.'],
    lead: 'My co-written bachelor’s thesis redesigned a flat university network around pfSense. Two more platforms are in progress.',
    stats: [{ value: 5, label: 'isolated VLANs' }, { value: 6, label: 'validation tests' }, { value: inProgress, label: 'projects in progress' }],
    items: PROJECTS.map((p) => ({ label: p.title, meta: p.status === 'completed' ? 'Completed' : 'In progress', status: p.status, href: p.links[0]?.href })),
    cta: { label: 'Projects on GitHub', href: GITHUB.projects },
    links: [{ label: 'Thesis (PDF)', href: GITHUB.thesisPdf }],
  },
  {
    id: 'certifications', word: 'CISCO', title: 'Certifications', ...visual('certifications'),
    headline: ['Six courses.', 'Six certificates.'],
    lead: 'Cisco Networking Academy, from networking basics to cyber threat management.',
    stats: [{ value: CERTIFICATES.length, label: 'Cisco Networking Academy certificates' }],
    thumbs: CERTIFICATES.map((c) => ({ src: certificateImage(c.id, true), href: certificateOnGitHub(c.id), alt: c.title })),
    cta: { label: 'Certificates on GitHub', href: GITHUB.certifications },
  },
  {
    id: 'rootme', word: 'CTF', title: 'Root-Me', ...visual('rootme'),
    headline: ['Break it.', 'Explain it.'],
    lead: 'Root-Me challenges documented as write-ups: steps, root cause and mitigations. Flags are never published.',
    stats: [{ value: ROOTME.length, label: 'write-ups' }, { value: new Set(ROOTME.map((r) => r.category)).size, label: 'categories' }],
    chips: [{ title: 'Categories', list: [...new Set(ROOTME.map((r) => r.category))] }],
    cta: { label: 'Write-ups on GitHub', href: GITHUB.rootme },
    links: [{ label: `Root-Me profile · ${PROFILE.links.rootmeHandle}`, href: PROFILE.links.rootme }],
  },
  {
    id: 'skills', word: 'STACK', title: 'Skills', ...visual('skills'),
    headline: ['Secure the network.', 'Build the app.'],
    lead: 'The tools of my pfSense thesis and of my development projects.',
    stats: [{ value: SKILLS.security.length, label: 'security and network tools' }, { value: SKILLS.development.length, label: 'development tools' }],
    chips: [{ title: 'Security & network', list: SKILLS.security }, { title: 'Development', list: SKILLS.development }],
    cta: { label: 'Skills on GitHub', href: GITHUB.skills },
  },
  {
    id: 'languages', word: 'FR·EN·中文', title: 'Languages', ...visual('languages'),
    headline: ['Three languages.', 'Two continents.'],
    lead: 'French and English for work. Mandarin since March 2026 at Qingdao Binhai University.',
    stats: [{ value: PROFILE.languages.length, label: 'languages' }, { value: 110, label: 'Duolingo English Test' }],
    items: PROFILE.languages.map((l) => ({ label: l.name, meta: l.level.replace(' — Qingdao Binhai University', '') })),
    cta: { label: 'GitHub profile', href: GITHUB.profile },
  },
  {
    id: 'contact', word: 'HELLO', title: 'Contact', ...visual('contact'),
    headline: ['Let’s talk', 'security.'],
    lead: 'The quickest ways to reach me.',
    stats: [],
    items: [
      ...(email ? [{ label: 'E-mail', meta: email, href: `mailto:${email}` }] : []),
      { label: 'GitHub', meta: 'github.com/geraldkabre', href: GITHUB.profile },
      { label: 'Root-Me', meta: PROFILE.links.rootmeHandle, href: PROFILE.links.rootme },
    ],
    cta: email ? { label: 'Send an e-mail', href: `mailto:${email}` } : { label: 'GitHub profile', href: GITHUB.profile },
  },
];

export const worldIndex = (id: string) => WORLDS.findIndex((w) => w.id === id);
