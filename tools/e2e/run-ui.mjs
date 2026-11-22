// UI paths of the real app: mouse selection, quality switching at runtime, help panel, resize, reduced motion.
// Usage: CV_BASE=http://127.0.0.1:4173 node tools/e2e/run-ui.mjs [--out test-results/e2e-ui]
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE } from './shoot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', 'test-results/e2e-ui');
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { browser, page, logs } = await launch(1440, 900);
await page.emulateMedia({ reducedMotion: 'reduce' });
const state = () => page.evaluate(() => window.__cv.state());
try {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cv && window.__cv.state().phase === 'select', null, { timeout: 180000 });
  // Mouse: hover the second card, click it (selects), click again / primary button (confirms).
  const cards = page.locator('.cv-card');
  check('two operator cards rendered', (await cards.count()) === 2);
  await cards.nth(1).hover();
  await sleep(300);
  check('hovering a card does not change the selection', await cards.nth(1).getAttribute('aria-checked') === 'false');
  await cards.nth(1).click();
  await sleep(300);
  check('clicking the second card selects it (no confirm)', (await cards.nth(1).getAttribute('aria-checked')) === 'true' && (await state()).phase === 'select');
  await cards.nth(0).click();
  await sleep(300);
  check('clicking a card selects it', await cards.nth(0).getAttribute('aria-checked') === 'true');
  await page.screenshot({ path: path.join(out, 'select-click.png') });
  const t0 = Date.now();
  await page.locator('.cv-primary').click();
  await page.waitForFunction(() => window.__cv.state().phase === 'play', null, { timeout: 10000 });
  check('primary button enters the Nexus (reduced motion: short transition)', true, `${Date.now() - t0} ms`);

  // Help panel via the HUD button, close with the X button.
  await page.locator('.cv-hud-actions .cv-icon-btn').click();
  await sleep(300);
  check('help panel opens from the HUD', (await state()).panel === 'help');
  await page.screenshot({ path: path.join(out, 'help.png') });
  await page.locator('.cv-panel .cv-icon-btn').click();
  await sleep(200);
  check('help panel closes', (await state()).panel === null);

  // Quality switching at runtime (composer + shadow map rebuild) keeps rendering without errors.
  for (const q of ['medium', 'low', 'high']) {
    await page.locator(`.cv-quality button:has-text("${q}")`).click();
    await sleep(900);
    const s = await state();
    check(`quality "${q}" applied at runtime`, s.stats.fps > 5, `fps=${s.stats.fps.toFixed(1)} calls=${s.stats.drawCalls}`);
    await page.screenshot({ path: path.join(out, `quality-${q}.png`) });
  }
  const saved = await page.evaluate(() => localStorage.getItem('cv.quality'));
  check('quality choice persisted', saved === 'high', saved);

  // Resize.
  await page.setViewportSize({ width: 900, height: 700 });
  await sleep(600);
  const size = await page.evaluate(() => { const c = document.querySelector('canvas'); return [c.width, c.height, c.clientWidth, c.clientHeight]; });
  check('canvas follows window resize', size[2] === 900 && size[3] === 700, size.join(' x '));
  await page.screenshot({ path: path.join(out, 'resized.png') });
  await page.setViewportSize({ width: 390, height: 780 });
  await sleep(600);
  await page.screenshot({ path: path.join(out, 'narrow.png') });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('no horizontal overflow at phone width', !overflow);

  const errors = logs.filter((l) => /\[error\]|\[pageerror\]/.test(l) && !/favicon|Failed to load resource/.test(l));
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  check('UI scenario completed', false, e.message);
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ results, logs: logs.slice(0, 100) }, null, 2));
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
