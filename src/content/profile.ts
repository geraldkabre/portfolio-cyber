/**
 * Professional content of CYBERVERSE (3D campus + Recruiter Mode). Single source of truth.
 *
 * Sources: the owner's profile notes (22/11/2026) and the repository documentation (README.md, docs/projects,
 * docs/certifications, docs/ctf/rootme). Nothing may be invented: no grades, no class rankings. Work in progress is
 * labelled. Every section links to its page on GitHub.
 *
 * The contact e-mail is not stored in the source: it comes from the build environment (VITE_CONTACT_EMAIL,
 * see .env.example). When it is not set, every e-mail link is simply hidden.
 */
const BLOB = 'https://github.com/geraldkabre/portfolio-cyber/blob/main';
const contactEmail = String(import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();

export const GITHUB = {
  profile: 'https://github.com/geraldkabre',
  repository: 'https://github.com/geraldkabre/portfolio-cyber',
  readme: `${BLOB}/README.md`,
  skills: `${BLOB}/README.md#technical-skills`,
  projects: `${BLOB}/docs/projects/README.md`,
  certifications: `${BLOB}/docs/certifications/README.md`,
  rootme: `${BLOB}/docs/ctf/rootme/README.md`,
  thesisPage: `${BLOB}/docs/projects/pfsense-umet-burkina/README.md`,
  thesisPdf: `${BLOB}/docs/projects/pfsense-umet-burkina/thesis-pfsense-umet-burkina.pdf`,
} as const;

export const PROFILE = {
  name: 'Gérald Kabré',
  title: 'Cybersecurity Engineer',
  focus: 'Network Security & Software Development',
  location: 'Burkina Faso',
  flag: '🇧🇫',
  current: 'Currently studying Mandarin Chinese at Qingdao Binhai University, China (since March 2026)',
  /** The owner's own one-line introduction (22/11/2026). */
  summary:
    'Cybersecurity graduate passionate about network security and building practical solutions to real-world ' +
    'security challenges.',
  languages: [
    { name: 'French', level: 'Native' },
    { name: 'English', level: 'B2 (Duolingo English Test 110)' },
    { name: 'Mandarin Chinese', level: 'Learning — Qingdao Binhai University' },
  ],
  links: {
    github: GITHUB.profile,
    rootme: 'https://www.root-me.org/godboy?lang=en#d937a1e09140fb65765a9e793f4c84a2',
    rootmeHandle: 'godboy',
    email: contactEmail,
    repository: GITHUB.repository,
  },
  /** Drop a professional photo at this path to replace the monogram everywhere (Recruiter Mode, dossier). */
  photo: '/assets/profile/photo.jpg',
} as const;

export const EDUCATION = [
  { period: 'March 2026 – now', title: 'Mandarin Chinese', school: 'Qingdao Binhai University, China', current: true },
  { period: '2024 – January 2026', title: 'Bachelor of Engineering — Cybersecurity of Computer & Industrial Systems', school: 'Dadoh University' },
  { period: '2022 – 2024', title: 'Preparatory classes', school: '2iE (CTI-accredited)' },
  { period: '2022', title: 'High School Diploma', school: 'Sacred Heart College, Dakar, Senegal' },
] as const;

export const EXPERIENCE = [
  {
    title: 'Switch Maker',
    detail: 'Intensive three-month development programme — Spring Boot and Angular.',
    tags: ['Spring Boot', 'Angular', 'Java'],
  },
  {
    title: 'E-commerce web application',
    detail: 'Built with Django, HTML/CSS and Git/GitHub, deployed on Render. Secured with strengthened authentication, input validation and CSRF protection.',
    tags: ['Django', 'Python', 'HTML/CSS', 'Git', 'Render'],
  },
  {
    title: 'Root-Me',
    detail: 'Regular practice in offensive and defensive security; 11 challenges documented as write-ups.',
    tags: ['Web-Client', 'Web-Server', 'Cryptanalysis'],
    link: GITHUB.rootme,
  },
] as const;

export type ProjectStatus = 'completed' | 'in-progress';

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  statusNote?: string;
  summary: string;
  method?: string[];
  highlights: string[];
  links: { label: string; href: string }[];
}

export const PROJECTS: Project[] = [
  {
    id: 'pfsense',
    title: 'pfSense-based network security solution — UMET-Burkina',
    status: 'completed',
    statusNote: 'Bachelor’s thesis · co-written · completed',
    summary: 'Redesign of a flat university network into a segmented, defense-in-depth architecture centred on pfSense.',
    method: [
      'Literature review',
      'Audit and risk analysis (ISO/IEC 27005), with a comparison of pfSense, OPNsense, Cisco ASA and FortiGate',
      'Design and deployment on VMware',
      'Security, performance and availability tests',
    ],
    highlights: ['5 isolated VLANs', 'Dual-WAN', 'Suricata IDS/IPS', 'SquidGuard', 'pfBlockerNG', '802.1X / RADIUS'],
    links: [
      { label: 'Project page on GitHub', href: GITHUB.thesisPage },
      { label: 'Thesis (PDF, French)', href: GITHUB.thesisPdf },
    ],
  },
  {
    id: 'ecommerce',
    title: 'China – Burkina Faso e-commerce platform',
    status: 'in-progress',
    summary: 'Cross-border e-commerce platform giving individuals and small businesses in Burkina Faso easier access to the Chinese market, designed secure by default.',
    highlights: ['Secure authentication and sessions', 'Protection of personal and payment data', 'Server-side validation and access control', 'OWASP Top 10 alignment'],
    links: [{ label: 'Project page on GitHub', href: `${BLOB}/docs/projects/china-burkina-ecommerce/README.md` }],
  },
  {
    id: 'study-china',
    title: '“Study in China” — guidance platform for Burkinabè students',
    status: 'in-progress',
    summary: 'Reliable guidance and application resources for students from Burkina Faso who want to study in China.',
    highlights: ['University and programme directory', 'Scholarships and deadlines', 'Application and visa guides', 'Student life in China'],
    links: [{ label: 'Project page on GitHub', href: `${BLOB}/docs/projects/study-in-china-guide/README.md` }],
  },
];

const CERT_FILES: Record<string, string> = {
  'introduction-to-cybersecurity': 'Introduction_to_cybersecurity.png',
  'networking-basics': 'Networking_Basics.png',
  'endpoint-security': 'Endpoint_Security.png',
  'network-defense': 'Network_Defense.png',
  'networking-devices-and-basic-configuration': 'Networking_Devices_and_Basic_Configuration.png',
  'cyber-threat-management': 'Cyber_threat_Management.png',
};

export const CERTIFICATES = [
  { id: 'introduction-to-cybersecurity', title: 'Introduction to Cybersecurity', focus: 'Security fundamentals and good practices' },
  { id: 'networking-basics', title: 'Networking Basics', focus: 'Network concepts and protocols' },
  { id: 'endpoint-security', title: 'Endpoint Security', focus: 'Hardening workstations and endpoints' },
  { id: 'network-defense', title: 'Network Defense', focus: 'Securing network infrastructure and operating systems' },
  { id: 'networking-devices-and-basic-configuration', title: 'Networking Devices & Basic Configuration', focus: 'Configuring Cisco network devices' },
  { id: 'cyber-threat-management', title: 'Cyber Threat Management', focus: 'Threat and vulnerability assessment and management' },
] as const;
export const CERTIFICATE_ISSUER = 'Cisco Networking Academy';
export const certificateImage = (id: string, thumb = false) => `/assets/profile/certificates/${id}${thumb ? '-thumb' : ''}.webp`;
export const certificateOnGitHub = (id: string) => `${BLOB}/docs/certifications/${CERT_FILES[id]}`;

export const ROOTME = [
  { title: 'HTML – Disabled Buttons', category: 'Web-Client', difficulty: 'Easy', vuln: 'Client-side enforcement (CWE-602)', file: 'html-disabled-buttons' },
  { title: 'JavaScript – Source', category: 'Web-Client', difficulty: 'Easy', vuln: 'Secret in source code (CWE-200)', file: 'javascript-source' },
  { title: 'JavaScript – Authentication', category: 'Web-Client', difficulty: 'Easy', vuln: 'Hard-coded credentials (CWE-200)', file: 'javascript-authentication-1' },
  { title: 'JavaScript – Authentication 2', category: 'Web-Client', difficulty: 'Medium', vuln: 'Hard-coded credentials (CWE-200)', file: 'javascript-authentication-2' },
  { title: 'JavaScript – Obfuscation 1', category: 'Web-Client', difficulty: 'Medium', vuln: 'Weak obfuscation (CWE-200)', file: 'javascript-obfuscation-1' },
  { title: 'HTTP – IP Restriction Bypass', category: 'Web-Server', difficulty: 'Medium', vuln: 'Header spoofing (CWE-290)', file: 'http-ip-restriction-bypass' },
  { title: 'HTTP – Open Redirect', category: 'Web-Server', difficulty: 'Medium', vuln: 'Open redirect (CWE-601)', file: 'http-open-redirect' },
  { title: 'HTTP – User-Agent', category: 'Web-Server', difficulty: 'Easy', vuln: 'Header spoofing (CWE-290)', file: 'http-user-agent' },
  { title: 'HTTP – Weak Password', category: 'Web-Server', difficulty: 'Easy', vuln: 'Default credentials (CWE-1392)', file: 'http-weak-password' },
  { title: 'Encoding – ASCII', category: 'Cryptanalysis', difficulty: 'Easy', vuln: 'Encoding is not encryption', file: 'encoding-ascii' },
  { title: 'Encoding – UU', category: 'Cryptanalysis', difficulty: 'Easy', vuln: 'Encoding is not encryption', file: 'encoding-uu' },
] as const;
export const rootmeLink = (file: string) => `${BLOB}/docs/ctf/rootme/${file}.md`;
export const ROOTME_METHOD = 'Each write-up: objective → recon → steps → root cause (CWE) → mitigations → lessons learned. Flags are never published.';

/**
 * Skills without levels (owner's request, 22/11/2026). Security tools: the owner's list plus the tools actually used
 * in the pfSense thesis (docs/projects/pfsense-umet-burkina: implementation and validation), not its "future work".
 */
export const SKILLS = {
  security: [
    'pfSense', 'Firewall policy & VLANs', 'Dual-WAN failover', 'Suricata IDS/IPS', 'Squid + SquidGuard', 'pfBlockerNG', 'SARG',
    '802.1X / RADIUS (WPA-Enterprise)', 'RSTP & Port Security', 'VMware Workstation', 'Nmap', 'Burp Suite', 'ISO/IEC 27005 risk analysis',
  ],
  development: ['Python', 'HTML / CSS', 'Git / GitHub', 'Java', 'Spring Boot', 'Angular', 'Django'],
} as const;

/** The pfSense thesis in depth (Research Institute + Recruiter Mode). */
export const RESEARCH = {
  title: 'Design and deployment of a pfSense-based network security solution',
  caseStudy: 'Case study: UMET-Burkina university network',
  authors: 'Gérald Marie Wend-Kuuni Kabré, Rahim Gildas Dabone',
  abstract:
    'An audit of the existing infrastructure revealed a flat, unsegmented network, Wi-Fi protected only by shared WPA2-PSK keys, ' +
    'and no filtering, intrusion detection or centralized logging. The pfSense architecture segments the network into five ' +
    'isolated VLANs, enforces a deny-by-default policy and adds web filtering, intrusion detection and prevention, ' +
    'WPA-Enterprise authentication and centralized logging.',
  figures: [
    { src: '/assets/profile/research/architecture-before.webp', w: 867, h: 507, caption: 'Initial architecture: flat network, no VLANs, no central firewall' },
    { src: '/assets/profile/research/architecture-after.webp', w: 861, h: 447, caption: 'Secured architecture: pfSense, Dual-WAN, redundant core with RSTP, five VLANs' },
    { src: '/assets/profile/research/test-vlan-isolation.webp', w: 830, h: 362, caption: 'Inter-VLAN isolation: students cannot reach administration' },
    { src: '/assets/profile/research/test-web-filtering.webp', w: 857, h: 435, caption: 'Web filtering: a blocked domain is denied by the proxy' },
    { src: '/assets/profile/research/test-suricata-alerts.webp', w: 867, h: 421, caption: 'Suricata alerts on an Nmap scan; the source is blocked' },
  ],
  pdf: '/assets/docs/thesis-pfsense-umet-burkina.pdf',
} as const;

export interface DistrictInfo { id: string; name: string; role: string; panel: PanelKey; github?: string }
export type PanelKey = 'profile' | 'academy' | 'soc' | 'missions' | 'research' | 'vault' | 'comms';

/** The seven districts of the Sentinel Nexus campus and the portfolio part each one presents. */
export const DISTRICTS: DistrictInfo[] = [
  { id: 'command', name: 'Main Command Center', role: 'Profile and campus map', panel: 'profile', github: GITHUB.readme },
  { id: 'academy', name: 'Identity & Academy District', role: 'Education and languages', panel: 'academy' },
  { id: 'soc', name: 'Security Operations Center', role: 'Security and development skills', panel: 'soc', github: GITHUB.skills },
  { id: 'missions', name: 'Project Mission Room', role: 'Projects and experience', panel: 'missions', github: GITHUB.projects },
  { id: 'research', name: 'Research Institute', role: 'pfSense thesis in depth', panel: 'research', github: GITHUB.thesisPage },
  { id: 'vault', name: 'Digital Proof Vault', role: 'Certificates and Root-Me write-ups', panel: 'vault', github: GITHUB.certifications },
  { id: 'comms', name: 'Communication Tower', role: 'Contact', panel: 'comms', github: GITHUB.profile },
];
