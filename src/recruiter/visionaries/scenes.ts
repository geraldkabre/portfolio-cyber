import { PROFILE } from '../../content/profile';

/**
 * Visionaries — the nine scenes (data model of docs/cyberverse/pantheon.md §17, adapted to the portfolio).
 *
 * Each scene is one part of the portfolio; its image is a real render of the CYBERVERSE district where that part
 * lives in the immersive campus (tools/visionaries/build-scenes.mjs). `section` is the Recruiter Mode anchor the
 * scene opens. Captions only restate facts from src/content/profile.ts.
 */
export type SceneTone = 'paint' | 'photo' | 'ink';

export interface Scene {
  id: string;
  title: string;
  caption: string;
  /** Recruiter Mode section opened from this scene. */
  section: string;
  image: string;
  thumb: string;
  bgFocus: string;
  thumbFocus: string;
  thumbScale: number;
  tone: SceneTone;
  /** Soft glow colour sampled from the render (brightest 3 % of pixels). */
  accent: string;
  /** Where the scene comes from (alt text of the disc). */
  place: string;
}

const img = (id: string) => `/assets/visionaries/${id}.jpg`;
const thumb = (id: string) => `/assets/visionaries/${id}-thumb.jpg`;

const scene = (s: Omit<Scene, 'image' | 'thumb' | 'tone'> & { tone?: SceneTone }): Scene => ({
  tone: 'paint', ...s, image: img(s.id), thumb: thumb(s.id),
});

export const SCENES: Scene[] = [
  scene({ id: 'profile', title: 'Gérald Kabré', caption: 'Cybersecurity engineer · Burkina Faso', section: 'profile', place: 'Main Command Center',
    bgFocus: '50% 50%', thumbFocus: '50% 40%', thumbScale: 1.35, accent: '#7cadbb' }),
  scene({ id: 'education', title: 'Education', caption: 'Dadoh University · 2iE · Qingdao Binhai', section: 'education', place: 'Identity & Academy District',
    bgFocus: '50% 50%', thumbFocus: '62% 44%', thumbScale: 1.5, accent: '#4e8d9e' }),
  scene({ id: 'experience', title: 'Experience', caption: 'Switch Maker · Django · Root-Me', section: 'experience', place: 'Project Mission Room',
    bgFocus: '50% 50%', thumbFocus: '50% 46%', thumbScale: 1.4, accent: '#99a6ba' }),
  scene({ id: 'projects', title: 'Projects', caption: 'pfSense thesis · two platforms in progress', section: 'projects', place: 'Research Institute',
    bgFocus: '50% 45%', thumbFocus: '50% 36%', thumbScale: 1.45, accent: '#b7bcc5' }),
  scene({ id: 'certifications', title: 'Cisco Certificates', caption: 'Six Networking Academy courses', section: 'certificates', place: 'Digital Proof Vault',
    bgFocus: '50% 50%', thumbFocus: '50% 50%', thumbScale: 1.45, accent: '#bec1c6' }),
  scene({ id: 'rootme', title: 'Root-Me', caption: 'Eleven documented write-ups', section: 'rootme', place: 'Digital Proof Vault, from above',
    bgFocus: '50% 50%', thumbFocus: '50% 46%', thumbScale: 1.5, accent: '#7982aa' }),
  scene({ id: 'skills', title: 'Skills', caption: 'pfSense · Suricata · Python · Git', section: 'skills', place: 'Security Operations Center',
    bgFocus: '50% 50%', thumbFocus: '50% 52%', thumbScale: 1.4, accent: '#407891' }),
  scene({ id: 'languages', title: 'Languages', caption: 'French · English B2 · Chinese', section: 'languages', place: 'The Sentinel Nexus campus',
    bgFocus: '50% 50%', thumbFocus: '50% 58%', thumbScale: 1.6, accent: '#3c607f' }),
  scene({ id: 'contact', title: 'Contact', caption: PROFILE.links.email ? 'E-mail · GitHub · Root-Me' : 'GitHub · Root-Me', section: 'contact', place: 'Communication Tower',
    bgFocus: '50% 40%', thumbFocus: '45% 44%', thumbScale: 1.4, accent: '#7da8d3' }),
];
