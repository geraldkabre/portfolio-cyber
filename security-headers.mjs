// Security headers of CYBERVERSE — the single list used by `vite preview` (local checks) and mirrored in
// netlify.toml (production). Keep both in sync.
//
// Everything the site loads is its own (no CDN, no web font service, no analytics), so the policy can be strict:
// scripts only from the site itself, no eval, no plugins, no framing. Inline *style attributes* are needed
// (React style props, GSAP), blob:/data: images come from the 3D loaders and the glass displacement map.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' data: blob:",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
