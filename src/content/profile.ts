/**
 * Professional content of CYBERVERSE (3D campus + Recruiter Mode + CV).
 *
 * Sources, in order: the owner's CYBERVERSE brief (identity, education, programmes, links) and the repository
 * documentation (README.md, docs/projects, docs/certifications, docs/ctf/rootme). Nothing may be invented:
 * no grades, no class rankings, no dates or results that are not in those sources. Work in progress is labelled.
 *
 * The contact e-mail is not stored in the source: it comes from the build environment (VITE_CONTACT_EMAIL,
 * see .env.example). When it is not set, every e-mail link is simply hidden.
 */
const REPO = 'https://github.com/geraldkabre/portfolio-cyber/blob/main';
const contactEmail = String(import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();

export const PROFILE = {
  name: 'Gérald Kabré',
  title: 'Cybersecurity Engineer',
  focus: 'Network Security and Software Development',
  location: 'Burkina Faso',
  summary:
    'Cybersecurity engineer from Burkina Faso, focused on network security and software development. ' +
    'I design and secure network infrastructures — segmentation, filtering, intrusion detection and access control — ' +
    'and I practise offensive security through documented CTF challenges.',
  languages: [
    { name: 'French', level: 'Native' },
    { name: 'English', level: 'B2' },
    { name: 'Mandarin', level: 'Studies at Qingdao Binhai University' },
  ],
  links: {
    github: 'https://github.com/geraldkabre',
    rootme: 'https://www.root-me.org/godboy?lang=en#d937a1e09140fb65765a9e793f4c84a2',
    email: contactEmail,
    repository: 'https://github.com/geraldkabre/portfolio-cyber',
  },
  /** Drop a professional photo at this path to replace the monogram everywhere (Recruiter Mode, dossier, CV). */
  photo: '/assets/profile/photo.jpg',
  cv: '/assets/cv/Gerald-Kabre-CV.pdf',
} as const;

export const EDUCATION = [
  { title: 'Bachelor of Engineering — Cybersecurity of Computer & Industrial Systems', school: 'Dadoh University' },
  { title: 'Mandarin studies', school: 'Qingdao Binhai University' },
  { title: 'Engineering preparatory classes', school: '2iE' },
] as const;

/** README.md "Technical Skills" + software stack named in the brief (Django, Spring Boot, Angular). */
export const SKILLS = [
  { area: 'Network security', items: ['pfSense', 'VLAN segmentation', 'Firewall policy', 'NAT', 'Dual-WAN', 'RSTP', 'Port Security'] },
  { area: 'Detection and filtering', items: ['Suricata IDS/IPS', 'SquidGuard', 'pfBlockerNG', 'Centralized logging'] },
  { area: 'Access control', items: ['WPA-Enterprise', 'IEEE 802.1X', 'RADIUS'] },
  { area: 'Offensive security', items: ['Burp Suite', 'curl', 'Browser DevTools', 'Web vulnerability analysis (CWE)'] },
  { area: 'Systems', items: ['Linux', 'VMware Workstation', 'Cisco devices'] },
  { area: 'Software development', items: ['Python / Django', 'Java / Spring Boot', 'Angular'] },
] as const;

export type ProjectStatus = 'completed' | 'in-progress';

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  statusNote?: string;
  domain: string;
  summary: string;
  highlights: string[];
  tech: string[];
  link?: string;
}

export const PROJECTS: Project[] = [
  {
    id: 'pfsense',
    title: 'pfSense-based network security solution — UMET Burkina',
    status: 'completed',
    statusNote: 'Bachelor’s thesis, co-authored · publicly defended on 17 January 2026',
    domain: 'Network security',
    summary: 'Redesign of a flat university network into a segmented, defense-in-depth architecture centred on pfSense.',
    highlights: [
      'Five isolated VLANs with a deny-by-default firewall policy',
      'Dual-WAN load balancing and failover, redundant switching core with RSTP',
      'Suricata IDS/IPS, SquidGuard and pfBlockerNG web filtering',
      'WPA-Enterprise (802.1X / RADIUS) for administrative Wi-Fi',
      'Validated by six functional tests, including automatic blocking of an Nmap scan',
    ],
    tech: ['pfSense', 'Suricata', 'SquidGuard', 'pfBlockerNG', '802.1X', 'RADIUS', 'VMware'],
    link: `${REPO}/docs/projects/pfsense-umet-burkina/README.md`,
  },
  {
    id: 'ecommerce',
    title: 'Secure e-commerce platform — China ↔ Burkina Faso',
    status: 'in-progress',
    domain: 'Secure web development',
    summary: 'Secure Django e-commerce application connecting China and Burkina Faso, giving local individuals and businesses easier access to the Chinese market.',
    highlights: [
      'Secure authentication and session management',
      'Protection of personal and payment data',
      'Server-side input validation and access control',
      'Alignment with the OWASP Top 10',
    ],
    tech: ['Python', 'Django'],
    link: `${REPO}/docs/projects/china-burkina-ecommerce/README.md`,
  },
  {
    id: 'study-china',
    title: 'Study in China — guidance platform for Burkinabè students',
    status: 'in-progress',
    domain: 'Web development · Education',
    summary: 'Web platform offering reliable guidance and application resources to students who wish to study in China.',
    highlights: ['University and programme directory', 'Scholarship opportunities and deadlines', 'Step-by-step application and visa guides'],
    tech: [],
    link: `${REPO}/docs/projects/study-in-china-guide/README.md`,
  },
];

/** Programmes and practice (no dates are published because none are documented). */
export const EXPERIENCE = [
  { title: 'Switch Maker programme', detail: 'Full-stack development with Spring Boot and Angular' },
  { title: 'Network security project for UMET Burkina', detail: 'Audit, design and lab deployment of the pfSense architecture (thesis, 2024–2025)' },
  { title: 'Cisco Networking Academy — Junior Cybersecurity Analyst career path', detail: 'Six courses completed (see certificates)' },
  { title: 'Root-Me practice', detail: '11 challenges documented with root cause (CWE) and mitigations' },
] as const;

export const CERTIFICATES = [
  { id: 'introduction-to-cybersecurity', title: 'Introduction to Cybersecurity', focus: 'Security fundamentals and good practices' },
  { id: 'networking-basics', title: 'Networking Basics', focus: 'Network concepts and protocols' },
  { id: 'networking-devices-and-basic-configuration', title: 'Networking Devices and Basic Configuration', focus: 'Configuring Cisco network devices' },
  { id: 'endpoint-security', title: 'Endpoint Security', focus: 'Hardening workstations and endpoints' },
  { id: 'network-defense', title: 'Network Defense', focus: 'Securing network infrastructure and operating systems' },
  { id: 'cyber-threat-management', title: 'Cyber Threat Management', focus: 'Threat and vulnerability assessment and management' },
] as const;
export const CERTIFICATE_ISSUER = 'Cisco Networking Academy · certificates of course completion';
export const certificateImage = (id: string, thumb = false) => `/assets/profile/certificates/${id}${thumb ? '-thumb' : ''}.webp`;

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
export const rootmeLink = (file: string) => `${REPO}/docs/ctf/rootme/${file}.md`;
export const ROOTME_METHOD = 'Objective → Recon → Steps → Root cause (CWE) → Mitigations → Lessons learned. Flags are never published.';

/** Research: the pfSense thesis (docs/projects/pfsense-umet-burkina). */
export const RESEARCH = {
  title: 'Design and deployment of a pfSense-based network security solution',
  caseStudy: 'Case study: UMET Burkina university network',
  institution: 'UMET Burkina – Institut des Sciences et Techniques de l’Ingénieur (ISTI)',
  authors: 'Gérald Marie Wend-Kuuni Kabré, Rahim Gildas Dabone',
  defended: 'Publicly defended on 17 January 2026',
  abstract:
    'An audit of the existing infrastructure revealed a flat, unsegmented network, Wi-Fi protected only by shared WPA2-PSK keys, ' +
    'and no filtering, intrusion detection or centralized logging. The pfSense architecture segments the network into five ' +
    'isolated VLANs, enforces a deny-by-default policy and adds web filtering, intrusion detection and prevention, ' +
    'WPA-Enterprise authentication and centralized logging, validated by six functional tests.',
  figures: [
    { src: '/assets/profile/research/architecture-before.webp', caption: 'Initial architecture: flat network, no VLANs, no central firewall' },
    { src: '/assets/profile/research/architecture-after.webp', caption: 'Secured architecture: pfSense, Dual-WAN, redundant core with RSTP, five VLANs' },
    { src: '/assets/profile/research/test-vlan-isolation.webp', caption: 'Test 3 — inter-VLAN isolation: students cannot reach administration' },
    { src: '/assets/profile/research/test-web-filtering.webp', caption: 'Test 5 — web filtering: a blocked domain is denied by the proxy' },
    { src: '/assets/profile/research/test-suricata-alerts.webp', caption: 'Test 6 — Suricata alerts on an Nmap scan; the source is blocked' },
  ],
  tests: ['WAN connectivity', 'DHCP per VLAN', 'Inter-VLAN isolation', 'Guest access limited to the Internet', 'Web filtering', 'IDS/IPS detection and automatic blocking'],
  pdf: '/assets/docs/thesis-pfsense-umet-burkina.pdf',
  future: ['High availability with two pfSense nodes (CARP)', 'Open-source SIEM (Wazuh, Graylog or ELK)', 'Captive portal with RADIUS/LDAP'],
} as const;

export type DistrictStatus = 'online' | 'construction';

/** The seven districts of the Sentinel Nexus campus. */
export const DISTRICTS: { id: string; name: string; role: string; status: DistrictStatus }[] = [
  { id: 'command', name: 'Main Command Center', role: 'Profile hub and navigation', status: 'online' },
  { id: 'academy', name: 'Identity & Academy District', role: 'Identity, education and languages', status: 'online' },
  { id: 'soc', name: 'Security Operations Center', role: 'Network security and defensive skills', status: 'online' },
  { id: 'missions', name: 'Project Mission Room', role: 'Projects, completed and in progress', status: 'online' },
  { id: 'research', name: 'Research Institute', role: 'pfSense thesis and validation evidence', status: 'online' },
  { id: 'vault', name: 'Digital Proof Vault', role: 'Certificates and Root-Me write-ups', status: 'online' },
  { id: 'comms', name: 'Communication Tower', role: 'Contact and CV', status: 'online' },
];

/** Short highlight list used by the Command Center dossier. */
export const HIGHLIGHTS = [
  { label: 'pfSense network security thesis', detail: 'Co-authored · five VLANs, deny-by-default policy, Suricata IDS/IPS, 802.1X' },
  { label: 'Cisco Networking Academy', detail: 'Six course completion certificates · Junior Cybersecurity Analyst path' },
  { label: 'Root-Me', detail: '11 documented write-ups · web-client, web-server, cryptanalysis' },
] as const;
