// Recruiter Mode — the nine world pages: slow-motion dive from the ring, short summaries with GitHub links,
// navigation (arrows, keys, Back, deep links), skills without levels, phone, reduced motion, print.
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
const WORLDS = ['profile', 'education', 'experience', 'projects', 'certifications', 'rootme', 'skills', 'languages', 'contact'];
const SUMMARY = 'Cybersecurity graduate passionate about network security, AI security, and building practical solutions to real-world security challenges.';
const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: [...GPU_ARGS, '--window-size=1440,900'] });

async function open(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, ...extra.context });
  const page = await ctx.newPage();
  const logs = []; const bad = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  if (extra.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/recruiter/' + (extra.hash ?? ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__vis && window.__vis.state.entranceDone, null, { timeout: 15000 });
  return { ctx, page, logs, bad };
}
const shot = async (page, name) => { try { await page.screenshot({ path: path.join(out, name), timeout: 15000 }); } catch { console.log(`(screenshot ${name} skipped)`); } };
/** Hidden animated blocks inside the open world page. */
const hiddenBlocks = (page) => page.evaluate(() => [...document.querySelectorAll('.w-layer .w-anim')].filter((el) => { const cs = getComputedStyle(el); return Number(cs.opacity) < 0.99 || cs.visibility === 'hidden'; }).length);
const worldState = (page) => page.evaluate(() => {
  const L = document.querySelector('.w-layer');
  if (!L) return null;
  const cta = L.querySelector('.w-cta');
  return {
    hash: location.hash, title: L.querySelector('.w-index')?.textContent, headline: L.querySelector('.w-headline')?.textContent,
    cta: cta?.getAttribute('href'), ctaLabel: cta?.textContent, nums: [...L.querySelectorAll('.w-num')].map((n) => [n.textContent, n.dataset.value]),
    text: L.innerText, overflow: L.scrollWidth > L.clientWidth + 1,
  };
});

try {
  // ------------------------------------------------------------------ desktop 1440×900
  {
    const { ctx, page, logs, bad } = await open({ width: 1440, height: 900 });
    const short = await page.evaluate(() => ({ sections: document.querySelectorAll('section.sec').length, height: document.documentElement.scrollHeight, vh: innerHeight, footer: document.querySelector('.rc-footer')?.innerText ?? '' }));
    check('short page: the ring and one footer line, no long duplicated sections', short.sections === 0 && short.height < short.vh * 1.3, `${short.height}px for a ${short.vh}px window`);
    check('the new short description is used', short.footer.includes(SUMMARY), short.footer.slice(0, 90));

    // Slow-motion dive from the focal disc: the circle grows fast, lingers in the middle, then finishes.
    await page.evaluate(() => window.__vis.markInput());
    const trace = await page.evaluate(() => new Promise((res) => {
      document.querySelector('.vis-cta').click();
      const pts = []; const t0 = performance.now();
      const f = () => {
        const L = document.querySelector('.w-layer');
        const m = L && /circle\(([\d.]+)px/.exec(getComputedStyle(L).clipPath);
        pts.push([performance.now() - t0, m ? Number(m[1]) : null]);
        if (performance.now() - t0 < 2600) requestAnimationFrame(f); else res(pts);
      };
      requestAnimationFrame(f);
    }));
    const firstIn = trace.find((p) => p[1] !== null)?.[0] ?? 0; // the layer's own clock
    const radii = trace.filter((p) => p[1] !== null).map((p) => [p[0] - firstIn, p[1]]);
    const at = (ms) => radii.reduce((b, p) => (Math.abs(p[0] - ms) < Math.abs(b[0] - ms) ? p : b), radii[0])[1];
    const full = Math.max(...radii.map((p) => p[1]));
    const early = (at(380) - at(0)) / 380, middle = (at(1150) - at(750)) / 400;
    const grows = radii.every((p, i) => i === 0 || p[1] >= radii[i - 1][1] - 0.5);
    check('slow-motion dive: the circle grows from the disc, slows down mid-way, then fills the screen (~1.9 s)', grows && at(0) < 150 && middle < early * 0.6 && radii[radii.length - 1][0] > 1700, `r(0)=${at(0)?.toFixed(0)} px, start ${early.toFixed(2)} px/ms vs middle ${middle.toFixed(2)} px/ms, full ${full.toFixed(0)} px`);
    await sleep(900);
    let w = await worldState(page);
    check('the profile world opens on its own page (#/profile), fully revealed', w?.hash === '#/profile' && (await hiddenBlocks(page)) === 0 && w.text.includes(SUMMARY), w?.hash);
    await shot(page, 'desktop-profile.png');
    const engine = await page.evaluate(() => window.__vis.state);
    check('the ring behind is paused while a world is open', engine.suspended && !engine.ticking);

    // Walk through all nine worlds with the arrow button: summaries, counters, GitHub links.
    const seen = []; let allOk = true; const issues = [];
    for (let k = 0; k < WORLDS.length; k++) {
      w = await worldState(page);
      const id = WORLDS[k];
      const okCta = id === 'contact' ? /^mailto:|^https:\/\/github\.com\//.test(w.cta) : /^https:\/\/github\.com\//.test(w.cta);
      const okNums = w.nums.every(([t, v]) => t === v);
      if (w.hash !== `#/${id}` || !okCta || !okNums || !w.headline || w.overflow) { allOk = false; issues.push(`${id}:${JSON.stringify({ hash: w.hash, cta: w.cta, nums: w.nums, overflow: w.overflow })}`); }
      seen.push(`${id}→${w.ctaLabel?.trim()}`);
      if (id === 'skills') {
        check('skills: no levels, thesis tools added', !/Beginner|Intermediate/.test(w.text) && ['Squid + SquidGuard', 'pfBlockerNG', 'Nmap', 'VMware Workstation', 'RSTP & Port Security'].every((t) => w.text.includes(t)));
        await shot(page, 'desktop-skills.png');
      }
      if (id === 'projects') await shot(page, 'desktop-projects.png');
      if (k < WORLDS.length - 1) { await page.click('.w-arrows button[aria-label^="Next"]'); await sleep(2300); }
    }
    check('nine worlds, each with a short summary, settled counters and its GitHub link', allOk, allOk ? seen.join(', ') : issues.slice(0, 2).join(' '));

    // Keyboard and Back.
    await page.keyboard.press('ArrowRight');
    await sleep(2300);
    check('→ wraps from Contact to Profile', (await worldState(page))?.hash === '#/profile');
    await page.goBack();
    await sleep(1700);
    const back = await page.evaluate(() => ({ hash: location.hash, layer: !!document.querySelector('.w-layer'), focal: window.__vis.state.focal, ticking: window.__vis.state.ticking, locked: document.documentElement.classList.contains('w-locked') }));
    check('browser Back closes the world: the ring returns with that world on top', !back.layer && back.hash === '' && back.focal === 0 && back.ticking && !back.locked, JSON.stringify(back));
    await page.click('.vis-cta');
    await sleep(2600);
    await page.click('.w-back');
    await sleep(1700);
    check('"All worlds" closes the page too', !(await page.evaluate(() => !!document.querySelector('.w-layer'))));

    // Print: every world's summary on paper.
    await page.emulateMedia({ media: 'print' });
    const pr = await page.evaluate(() => ({ visible: getComputedStyle(document.querySelector('.rc-print')).display, worlds: document.querySelectorAll('.rc-print-world').length, stage: getComputedStyle(document.querySelector('.vis-root')).display }));
    check('print: a one-page summary of every world, without the ring', pr.visible === 'block' && pr.worlds === 8 && pr.stage === 'none', JSON.stringify(pr));
    await page.emulateMedia({ media: 'screen' });
    check('desktop: no console errors or warnings', logs.length === 0, logs.slice(0, 3).join(' | '));
    check('desktop: no broken assets', bad.length === 0, bad.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ deep link
  {
    const { ctx, page, logs } = await open({ width: 1440, height: 900 }, { hash: '#/projects' });
    await sleep(2600);
    const w = await worldState(page);
    check('deep link /recruiter/#/projects opens that world directly', w?.hash === '#/projects' && /network/i.test(w.headline) && (await hiddenBlocks(page)) === 0, w?.headline);
    await page.keyboard.press('Escape');
    await sleep(1600);
    check('Esc after a deep link returns to the ring with Projects on top', await page.evaluate(() => !document.querySelector('.w-layer') && window.__vis.state.focal === 3 && location.hash === ''));
    check('deep link: no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ phone 390×844
  {
    const { ctx, page, logs } = await open({ width: 390, height: 844 }, { context: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });
    await page.evaluate(() => window.__vis.markInput());
    const focal = await page.evaluate(() => window.__vis.state.focal);
    const b = await page.locator(`.vis-med[data-index="${focal}"]`).boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(2700);
    const w = await worldState(page);
    check('phone: tapping the top disc opens its world', w?.hash === `#/${WORLDS[focal]}` && (await hiddenBlocks(page)) === 0);
    check('phone: no horizontal overflow on the world page', w && !w.overflow);
    await shot(page, 'phone-world.png');
    await page.locator('.w-arrows button[aria-label^="Next"]').tap();
    await sleep(2400);
    await page.locator('.w-arrows button[aria-label^="Next"]').tap();
    await sleep(2400);
    await shot(page, 'phone-world-2.png');
    check('phone: arrows move between worlds', (await worldState(page))?.hash === `#/${WORLDS[(focal + 2) % 9]}`);
    check('phone: no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ reduced motion
  {
    const { ctx, page, logs } = await open({ width: 1440, height: 900 }, { reduced: true });
    await page.click('.vis-cta');
    await sleep(450);
    const w = await worldState(page);
    check('reduced motion: the world appears at once (no dive, no reveal)', w?.hash === '#/profile' && (await hiddenBlocks(page)) === 0 && w.nums.every(([t, v]) => t === v));
    check('reduced motion: no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
    await ctx.close();
  }
} catch (e) {
  check('scenario completed', false, e.stack?.split('\n').slice(0, 3).join(' '));
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
