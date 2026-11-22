// Generates the downloadable CV (A4 PDF) from the print layout of Recruiter Mode, with the installed Edge.
// The CV therefore always matches the site content (src/content/profile.ts).
// Usage: start the dev or preview server, then: node tools/cv/build-cv.mjs   (CV_BASE=http://127.0.0.1:4173 for preview)
// The contact e-mail comes from VITE_CONTACT_EMAIL (.env.local) at build/serve time; without it the CV has no e-mail line.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, BASE } from '../e2e/shoot.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..', '..', 'public', 'assets', 'cv', 'Gerald-Kabre-CV.pdf');
const { browser, page, logs } = await launch(1240, 1754);
try {
  await page.goto(`${BASE}/recruiter/`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({
    path: out, format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font:7pt sans-serif;color:#6b7280;padding:0 14mm;display:flex;justify-content:space-between">'
      + '<span>Gérald Kabré — Cybersecurity Engineer</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  const pdf = fs.readFileSync(out);
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`CV written: ${out} (${(pdf.length / 1024).toFixed(0)} KB, ${pages} page(s))`);
} finally {
  const errors = logs.filter((l) => /error/i.test(l) && !/favicon|Failed to load resource/.test(l));
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
}
