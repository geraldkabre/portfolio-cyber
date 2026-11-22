// Touch controls on a phone-sized viewport (virtual stick, camera drag, interact button), real pointer input.
// Usage: node tools/e2e/run-touch.mjs [--out test-results/e2e-touch]
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE } from './shoot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', 'test-results/e2e-touch');
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { browser, page, logs } = await launch(412, 860);
const state = () => page.evaluate(() => window.__cv.state());
try {
  await page.goto(BASE + '/?mode=immersive&touch=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cv && window.__cv.state().phase === 'select', null, { timeout: 180000 });
  await page.screenshot({ path: path.join(out, 'select-phone.png') });
  await page.evaluate(() => window.__cv.confirm('male'));
  await page.waitForFunction(() => window.__cv.state().phase === 'play', null, { timeout: 15000 });
  await sleep(500);
  check('touch controls shown (stick + buttons), keyboard hints hidden', await page.locator('.cv-stick').count() === 1 && await page.locator('.cv-controls').count() === 0);
  await page.screenshot({ path: path.join(out, 'play-phone.png') });
  // Push the stick fully forward for 1.5 s.
  const box = await page.locator('.cv-stick').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const p0 = (await state()).position;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 70, { steps: 4 });
  await sleep(1500);
  let s = await state();
  check('full stick push runs forward', s.gait === 'run' && s.speed > 3.5, `gait=${s.gait} speed=${s.speed}`);
  await page.screenshot({ path: path.join(out, 'run-phone.png') });
  await page.mouse.move(cx, cy - 20, { steps: 3 });
  await sleep(1200);
  s = await state();
  check('light stick push walks', s.gait === 'walk', `gait=${s.gait} speed=${s.speed}`);
  await page.mouse.up();
  await sleep(1200);
  s = await state();
  const moved = Math.hypot(s.position[0] - p0[0], s.position[2] - p0[2]);
  check('releasing the stick stops; operator moved', s.gait === 'idle' && moved > 3, `moved ${moved.toFixed(1)} m`);
  // Camera drag on the right half.
  const yaw0 = s.camYaw;
  await page.mouse.move(330, 420);
  await page.mouse.down();
  await page.mouse.move(250, 420, { steps: 6 });
  await page.mouse.up();
  await sleep(200);
  s = await state();
  check('dragging on the right rotates the camera', Math.abs(s.camYaw - yaw0) > 0.1, `${yaw0} -> ${s.camYaw}`);
  // Interact button next to the dossier table.
  await page.evaluate(() => window.__cv.teleport(0, 0.5, 3.0, Math.PI));
  await sleep(500);
  await page.locator('.cv-tbtn[aria-label="Interact"]').click();
  await sleep(600);
  s = await state();
  check('E button opens the terminal panel', s.panel === 'profile', `panel=${s.panel}`);
  await page.screenshot({ path: path.join(out, 'panel-phone.png') });
  const errors = logs.filter((l) => /\[error\]|\[pageerror\]/.test(l) && !/favicon|Failed to load resource/.test(l));
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  check('touch scenario completed', false, e.message);
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
