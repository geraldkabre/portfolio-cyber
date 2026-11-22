// Recruiter Mode — sections, motion layer (reveals, active navigation, interactive cards, parallax), reduced
// motion, print, scroll smoothness, desktop 1440×900 and phone 390×844.
// Usage: node tools/e2e/run-recruiter.mjs [--out test-results/e2e-recruiter]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { EDGE, GPU_ARGS, BASE } from './shoot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', 'test-results/e2e-recruiter');
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SECTIONS = ['profile', 'education', 'experience', 'projects', 'research', 'certificates', 'rootme', 'skills', 'languages', 'contact'];
const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: [...GPU_ARGS, '--window-size=1440,900'] });

async function open(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, ...extra.context });
  const page = await ctx.newPage();
  const logs = []; const bad = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  if (extra.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/recruiter/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__vis && window.__vis.state.entranceDone, null, { timeout: 15000 });
  return { ctx, page, logs, bad };
}
/** Hidden reveal targets inside a section (opacity < 1 or visibility hidden). */
const hiddenIn = (page, id) => page.evaluate((id) => {
  const sec = document.getElementById(id);
  return [...sec.querySelectorAll('*')].filter((el) => { const cs = getComputedStyle(el); return el.getClientRects().length && (Number(cs.opacity) < 0.99 || cs.visibility === 'hidden'); }).length;
}, id);
const shot = async (page, name, opts = {}) => { try { await page.screenshot({ path: path.join(out, name), timeout: 15000, ...opts }); } catch (e) { console.log(`(screenshot ${name} skipped)`); } };

try {
  for (const [label, viewport, extra] of [['desktop 1440×900', { width: 1440, height: 900 }, {}], ['phone 390×844', { width: 390, height: 844 }, { context: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }]]) {
    const { ctx, page, logs, bad } = await open(viewport, extra);
    const info = await page.evaluate(() => ({
      sections: [...document.querySelectorAll('section.sec')].map((s) => s.id),
      github: [...document.querySelectorAll('a[href*="github.com"]')].length,
      h1: document.querySelector('h1')?.textContent?.trim(),
      cv: /\bCV\b|curriculum/i.test(document.body.innerText),
    }));
    check(`${label}: all ten portfolio sections, one h1, GitHub links, no CV`, SECTIONS.every((s) => info.sections.includes(s)) && info.github >= 30 && /Kabré/.test(info.h1 ?? '') && !info.cv, `${info.sections.length} sections, ${info.github} GitHub links, h1="${info.h1}"`);
    const before = await hiddenIn(page, 'education');
    check(`${label}: sections below the fold wait for their reveal`, before > 0, `${before} hidden blocks in Education before scrolling`);

    // Travel section by section through the navigation: every block ends up visible, the clicked section is the
    // active one and the indicator sits under it.
    let allVisible = true; let navOk = true; const misses = [];
    for (const id of SECTIONS) {
      await page.click(`.rc-nav a[href="#${id}"]`);
      await sleep(1700);
      const hidden = await hiddenIn(page, id);
      if (hidden) { allVisible = false; misses.push(`${id}:${hidden}`); }
      const nav = await page.evaluate(() => {
        const a = document.querySelector('.rc-nav a[aria-current]'); const ink = document.querySelector('.rc-nav-ink');
        const m = new DOMMatrix(getComputedStyle(ink).transform);
        return { href: a?.getAttribute('href'), x: m.m41, left: a?.offsetLeft, w: ink.offsetWidth, aw: a?.offsetWidth, visible: a ? a.getBoundingClientRect().right <= innerWidth + 1 && a.getBoundingClientRect().left >= -1 : false };
      });
      if (nav.href !== `#${id}` || Math.abs(nav.x - nav.left) > 2 || Math.abs(nav.w - nav.aw) > 2 || !nav.visible) { navOk = false; misses.push(`nav@${id}:${JSON.stringify(nav)}`); }
      if (['education', 'projects', 'certificates', 'skills', 'contact'].includes(id)) await shot(page, `${label.split(' ')[0]}-${id}.png`);
    }
    check(`${label}: every section fully revealed once scrolled into view`, allVisible, misses.filter((m) => !m.startsWith('nav')).join(' '));
    check(`${label}: navigation indicator slides to the active section (and stays in view)`, navOk, misses.filter((m) => m.startsWith('nav')).slice(0, 2).join(' '));
    // Reading by scrolling (no click): the indicator follows the section under the reading line.
    await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel'))); // the reader takes over (unpins the last click)
    await page.evaluate(() => { const el = document.getElementById('experience'); scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * 0.3, behavior: 'instant' }); });
    await sleep(900);
    const readMid = await page.evaluate(() => document.querySelector('.rc-nav a[aria-current]')?.getAttribute('href'));
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await sleep(500);
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await sleep(900);
    const readEnd = await page.evaluate(() => document.querySelector('.rc-nav a[aria-current]')?.getAttribute('href'));
    check(`${label}: while scrolling, the section under the reading line is active (Contact at the bottom)`, readMid === '#experience' && readEnd === '#contact', `${readMid}, ${readEnd}`);

    // Nav click scrolls smoothly to the section.
    await page.evaluate(() => scrollTo(0, document.getElementById('profile').offsetTop));
    await sleep(800);
    await page.click('.rc-nav a[href="#skills"]');
    await sleep(1600);
    const skillsTop = await page.evaluate(() => document.getElementById('skills').getBoundingClientRect().top);
    check(`${label}: navigation link scrolls to its section`, skillsTop > -5 && skillsTop < 120, `top=${skillsTop.toFixed(0)}`);

    if (label.startsWith('desktop')) {
      // Interactive project card: lift + tilt + spotlight on hover, reset on leave.
      await page.evaluate(() => document.getElementById('projects').scrollIntoView({ behavior: 'instant' }));
      await sleep(1400);
      const card = page.locator('#projects .sec-card').first();
      const b = await card.boundingBox();
      await page.mouse.move(b.x + b.width * 0.8, b.y + b.height * 0.25, { steps: 6 });
      await sleep(700);
      const hot = await card.evaluate((el) => { const t = getComputedStyle(el).transform; return { hot: el.classList.contains('is-hot'), t, y: t === 'none' ? 0 : new DOMMatrix(t).m42, mx: el.style.getPropertyValue('--mx') }; });
      await shot(page, 'desktop-card-hover.png', { clip: { x: b.x - 20, y: b.y - 20, width: b.width + 40, height: Math.min(b.height + 40, 700) } });
      await page.mouse.move(5, 5, { steps: 4 });
      await sleep(900);
      const cold = await card.evaluate((el) => { const t = getComputedStyle(el).transform; return { hot: el.classList.contains('is-hot'), y: t === 'none' ? 0 : new DOMMatrix(t).m42 }; });
      check('desktop: project card lifts, tilts and follows the pointer; settles on leave', hot.hot && hot.y < -2 && /matrix3d/.test(hot.t) && hot.mx && !cold.hot && Math.abs(cold.y) < 0.5, `lift ${hot.y.toFixed(1)} px, ${hot.t.slice(0, 22)}…, mx=${hot.mx}`);

      // Parallax on the Visionaries stage (containers only; the ring keeps its own transforms).
      await page.evaluate(() => scrollTo(0, 0));
      await sleep(700);
      const p0 = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.vis-orbit')).transform).m42);
      await page.evaluate(() => scrollTo(0, innerHeight * 0.5));
      await sleep(1200);
      const p1 = await page.evaluate(() => ({ orbit: new DOMMatrix(getComputedStyle(document.querySelector('.vis-orbit')).transform).m42, title: new DOMMatrix(getComputedStyle(document.querySelector('.vis-title-inner')).transform).m42, glass: window.__vis.state.glass }));
      check('desktop: subtle parallax on the stage while it scrolls away (glass still live)', Math.abs(p0) < 0.5 && p1.orbit > 20 && p1.title > p1.orbit && p1.glass === 'native', `orbit ${p0.toFixed(1)} → ${p1.orbit.toFixed(1)} px, title ${p1.title.toFixed(1)} px`);

      // Scroll smoothness: frame times while scrolling the whole page.
      const frames = await page.evaluate(() => new Promise((res) => {
        scrollTo(0, 0);
        const dts = []; let last = 0; const H = document.documentElement.scrollHeight - innerHeight; const t0 = performance.now();
        const f = (t) => { if (last) dts.push(t - last); last = t; const k = (t - t0) / 6000; scrollTo(0, H * Math.min(1, k)); if (k < 1) requestAnimationFrame(f); else res(dts); };
        requestAnimationFrame(f);
      }));
      const sorted = [...frames].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
      check('desktop: scrolling the whole page stays smooth', avg < 20 && p95 < 34, `avg ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps), p95 ${p95.toFixed(1)} ms`);

      // Print: everything visible, stage hidden.
      await page.emulateMedia({ media: 'print' });
      const pr = await page.evaluate(() => ({ hidden: [...document.querySelectorAll('main *')].filter((el) => el.getClientRects().length && Number(getComputedStyle(el).opacity) < 0.99).length, stage: getComputedStyle(document.querySelector('.vis-root')).display }));
      check('print: every block visible, the stage is left out', pr.hidden === 0 && pr.stage === 'none', JSON.stringify(pr));
      await page.emulateMedia({ media: 'screen' });
    } else {
      const hz = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      check('phone: no horizontal overflow anywhere', hz);
    }
    check(`${label}: no console errors or warnings`, logs.length === 0, logs.slice(0, 3).join(' | '));
    check(`${label}: no broken assets`, bad.length === 0, bad.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // Reduced motion: nothing waits for a reveal, no tilt, no parallax.
  const { ctx, page, logs } = await open({ width: 1440, height: 900 }, { reduced: true });
  const hidden = await Promise.all(SECTIONS.map((id) => hiddenIn(page, id)));
  const orbit = await page.evaluate(() => { scrollTo(0, innerHeight * 0.5); return new Promise((r) => setTimeout(() => r(getComputedStyle(document.querySelector('.vis-orbit')).transform), 500)); });
  check('reduced motion: all content visible immediately, no parallax', hidden.every((h) => h === 0) && (orbit === 'none' || new DOMMatrix(orbit).m42 === 0), `hidden ${hidden.join(',')} orbit ${orbit}`);
  check('reduced motion: no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  await ctx.close();
} catch (e) {
  check('scenario completed', false, e.stack?.split('\n').slice(0, 3).join(' '));
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
