/**
 * Professional content shown in CYBERVERSE.
 * Sources: the repository documentation (README.md, docs/projects, docs/certifications, docs/ctf) and the owner's
 * brief for CYBERVERSE. Nothing here may be invented; grades and class rankings are never displayed.
 * Milestone 3 only uses the identity card, links and education; the full content arrives with Milestone 6.
 */
export const PROFILE = {
  name: 'Gérald Kabré',
  title: 'Cybersecurity Engineer',
  focus: 'Network Security and Software Development',
  location: 'Burkina Faso',
  languages: ['French (native)', 'English (B2)'],
  links: {
    github: 'https://github.com/geraldkabre',
    rootme: 'https://www.root-me.org/godboy?lang=en#d937a1e09140fb65765a9e793f4c84a2',
    email: 'geraldkabre@gmail.com',
  },
} as const;

export const EDUCATION = [
  { title: 'Bachelor of Engineering — Cybersecurity of Computer & Industrial Systems', school: 'Dadoh University' },
  { title: 'Mandarin studies', school: 'Qingdao Binhai University' },
  { title: 'Engineering preparatory classes', school: '2iE' },
] as const;

/** Verified in the repository: docs/certifications (6 certificates) and docs/ctf/rootme (11 write-ups). */
export const HIGHLIGHTS = [
  { label: 'pfSense network security thesis', detail: 'Co-authored · segmented defense-in-depth network, Suricata IDS/IPS, 802.1X' },
  { label: 'Cisco Networking Academy', detail: '6 training certificates · Junior Cybersecurity Analyst path' },
  { label: 'Root-Me', detail: '11 documented write-ups · web-client, web-server, cryptanalysis' },
] as const;

export type DistrictStatus = 'online' | 'construction';

/** The seven districts of the Sentinel Nexus campus (Milestone 5 builds the remaining six). */
export const DISTRICTS: { id: string; name: string; role: string; status: DistrictStatus }[] = [
  { id: 'command', name: 'Main Command Center', role: 'Profile hub and navigation', status: 'online' },
  { id: 'academy', name: 'Identity & Academy District', role: 'Background, education, languages', status: 'construction' },
  { id: 'soc', name: 'Security Operations Center', role: 'Network security and defensive skills', status: 'construction' },
  { id: 'missions', name: 'Project Mission Room', role: 'Projects (completed and in progress)', status: 'construction' },
  { id: 'research', name: 'Research Institute', role: 'pfSense thesis and research work', status: 'construction' },
  { id: 'vault', name: 'Digital Proof Vault', role: 'Certificates and Root-Me write-ups', status: 'construction' },
  { id: 'comms', name: 'Communication Tower', role: 'Contact', status: 'construction' },
];
