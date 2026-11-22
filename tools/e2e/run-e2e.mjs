// End-to-end test of the real application in headless Microsoft Edge (real GPU), with real keyboard and mouse input.
// Usage: node tools/e2e/run-e2e.mjs [--operator female|male] [--out test-results/e2e] [--quality high] [--w 1600 --h 900]
// Requires the Vite dev server (npm run dev) or a preview server (CV_BASE=http://127.0.0.1:4173).
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE } from './shoot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const operator = arg('--operator', 'female');
const out = arg('--out', `test-results/e2e/${operator}`);
const quality = arg('--quality', 'high');
const W = Number(arg('--w', 1600)), H = Number(arg('--h', 900));
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { browser, page, logs } = await launch(W, H);
await page.addInitScript((q) => { try { localStorage.setItem('cv.quality', q); } catch {} }, quality);
const state = () => page.evaluate(() => window.__cv.state());
const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) });
const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of [...keys].reverse()) await page.keyboard.up(k); };

try {
  const t0 = Date.now();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(400);
  await shot('00-loading');
  await page.waitForFunction(() => window.__cv && window.__cv.state().phase === 'select', null, { timeout: 180000 });
  const loadMs = Date.now() - t0;
  check('app loads and reaches operator selection', true, `${loadMs} ms`);
  await sleep(1500);
  await shot('01-select-female');
  await page.keyboard.press('ArrowRight');
  await sleep(1200);
  await shot('02-select-male');
  let s = await state();
  check('arrow keys switch the hovered operator', true);
  if (operator === 'female') { await page.keyboard.press('ArrowLeft'); await sleep(900); }
  await page.keyboard.press('Enter');
  await sleep(700);
  await shot('03-entering');
  await page.waitForFunction(() => window.__cv.state().phase === 'play', null, { timeout: 15000 });
  await sleep(600);
  s = await state();
  check('selection enters third-person play', s.phase === 'play', `clip=${s.clip} pos=${s.position}`);
  check('idle animation plays after spawn', s.gait === 'idle' && /Idle/.test(s.clip), s.clip);
  await shot('04-play-spawn');

  // Mouse look (real mouse drag on the canvas).
  const camYaw0 = s.camYaw;
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) await page.mouse.move(W / 2 + i * 12, H / 2 + i * 2);
  await page.mouse.up();
  await sleep(200);
  s = await state();
  check('mouse look rotates the camera', Math.abs(s.camYaw - camYaw0) > 0.05, `camYaw ${camYaw0} -> ${s.camYaw}, pointerLock may be unavailable headless`);
  await page.evaluate(() => window.__cv.setCamera(0, 0.32));
  await sleep(300);

  // Run (default gait).
  let p0 = (await state()).position;
  await page.keyboard.down('KeyW');
  await sleep(1200);
  s = await state();
  check('W runs forward (Jog clip, speed-matched)', s.gait === 'run' && s.speed > 3.5, `gait=${s.gait} speed=${s.speed} clip=${s.clip}`);
  await shot('05-run');
  await page.keyboard.down('ShiftLeft');
  await sleep(1100);
  s = await state();
  check('Shift sprints', s.gait === 'sprint' && s.speed > 5.8, `gait=${s.gait} speed=${s.speed}`);
  await shot('06-sprint');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await sleep(1200);
  s = await state();
  check('releasing keys decelerates to idle', s.gait === 'idle' && s.speed < 0.2, `gait=${s.gait} speed=${s.speed}`);
  const moved = Math.hypot(s.position[0] - p0[0], s.position[2] - p0[2]);
  check('character actually moved', moved > 5, `${moved.toFixed(2)} m`);

  // Walk toggle.
  await page.evaluate(() => window.__cv.teleport(10, 0, 20, Math.PI / 2));
  await sleep(300);
  await page.keyboard.press('KeyC');
  await page.keyboard.down('KeyW');
  await sleep(1200);
  s = await state();
  check('C toggles walk mode (Walk clip)', s.gait === 'walk' && s.speed > 1.1 && s.speed < 1.8, `gait=${s.gait} speed=${s.speed}`);
  await shot('07-walk');
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyC');
  await sleep(800);

  // Jump.
  await page.keyboard.press('Space');
  await sleep(250);
  s = await state();
  const jumped = s.position[1] > 0.4 || !s.grounded;
  check('Space jumps (airborne)', jumped, `y=${s.position[1]} grounded=${s.grounded} gait=${s.gait}`);
  await sleep(1300);
  s = await state();
  check('lands back on the ground', s.grounded && Math.abs(s.position[1]) < 0.05, `y=${s.position[1]}`);

  // Rim collision: run outward toward the east edge for 4 s.
  await page.evaluate(() => window.__cv.teleport(26, 0, 12, Math.atan2(26, 12)));
  await sleep(200);
  await hold(['KeyW'], 4000);
  s = await state();
  const r = Math.hypot(s.position[0], s.position[2]);
  check('rim wall keeps the operator on the island', r < 31.0, `radius=${r.toFixed(2)}`);

  // Command Center: approach the gate, door opens, walk to the dossier.
  await page.evaluate(() => window.__cv.teleport(0, 0, 17, Math.PI));
  await sleep(300);
  await hold(['KeyW'], 1500);
  s = await state();
  check('gate opens when approaching', s.door > 0.5, `door=${s.door}`);
  await shot('08-gate');
  await hold(['KeyW'], 2600);
  s = await state();
  check('walks into the operations hall through the gate', Math.hypot(s.position[0], s.position[2]) < 9, `pos=${s.position} location=${s.location}`);
  await page.evaluate(() => window.__cv.teleport(0, 0.5, 3.0, Math.PI));
  await sleep(500);
  s = await state();
  check('dossier prompt appears next to the holo table', !!s.prompt, s.prompt ?? 'none');
  await shot('09-hall-prompt');
  await page.keyboard.press('KeyE');
  await sleep(600);
  s = await state();
  check('E opens the operator dossier', s.panel === 'dossier');
  await shot('10-dossier');
  await page.keyboard.press('Escape');
  await sleep(400);
  s = await state();
  check('Esc closes the dossier', s.panel === null);

  // Camera collision inside the hall: face a wall from close range with a long camera distance.
  await page.evaluate(() => { window.__cv.teleport(0, 0.5, -6.5, Math.PI); window.__cv.setCamera(Math.PI + Math.PI, 0.25, 8); });
  await sleep(600);
  s = await state();
  const camR = Math.hypot(s.camPos[0], s.camPos[2]);
  check('camera stays inside the hall (collision)', camR < 9.4, `camera radius=${camR.toFixed(2)}`);
  await shot('11-camera-collision');
  await page.evaluate(() => window.__cv.setCamera(0, 0.32, 4.6));

  // Portal: east gate -> outpost.
  await page.evaluate(() => window.__cv.teleport(21.5, 0, 0, Math.PI / 2));
  await sleep(400);
  await shot('12-portal-approach');
  await hold(['KeyW'], 2200);
  await sleep(800);
  s = await state();
  check('portal teleports to the Academy outpost', s.position[0] > 80 && Math.abs(s.yaw - Math.PI / 2) < 0.2, `pos=${s.position} location=${s.location}`);
  await shot('13-outpost');
  await page.evaluate(() => window.__cv.teleport(97.4, -6.89, -15.9, -0.55 + Math.PI));
  await sleep(500);
  s = await state();
  check('district brief prompt on the outpost', !!s.prompt, s.prompt ?? 'none');
  await page.keyboard.press('KeyE');
  await sleep(500);
  s = await state();
  check('E opens the district brief', s.panel === 'brief');
  await shot('14-brief');
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.evaluate(() => window.__cv.teleport(95.0, -6.89, -14.1, -Math.PI / 2));
  await sleep(300);
  await hold(['KeyW'], 2000);
  await sleep(800);
  s = await state();
  check('return portal brings the operator back to Nexus Prime', Math.hypot(s.position[0], s.position[2]) < 31, `pos=${s.position}`);

  // Performance: 12 s of scripted movement around the plaza, frame times measured in the page.
  await page.evaluate(() => window.__cv.teleport(0, 0, 24, Math.PI));
  await sleep(500);
  await page.evaluate(() => {
    window.__perf = [];
    let last = performance.now();
    const f = (now) => { window.__perf.push(now - last); last = now; if (window.__perf.length < 100000) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 24; i++) { await page.evaluate((k) => window.__cv.look(k, 0), 40); await sleep(500); }
  await page.keyboard.up('KeyW');
  const perf = await page.evaluate(() => {
    const a = window.__perf.slice(30).sort((x, y) => x - y);
    const avg = a.reduce((s, v) => s + v, 0) / a.length;
    return { frames: a.length, avgMs: +avg.toFixed(2), fps: +(1000 / avg).toFixed(1), p95Ms: +a[Math.floor(a.length * 0.95)].toFixed(2), p99Ms: +a[Math.floor(a.length * 0.99)].toFixed(2), stats: window.__cv.state().stats, gl: window.__cv.state().gl };
  });
  check('performance measured (12 s scripted run)', perf.frames > 100, JSON.stringify(perf));
  await shot('15-perf-end');

  const errors = logs.filter((l) => /\[error\]|\[pageerror\]/.test(l) && !/favicon|Failed to load resource/.test(l));
  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ operator, quality, viewport: [W, H], loadMs, perf, results, logs: logs.slice(0, 200) }, null, 2));
} catch (e) {
  check('scenario completed', false, e.message);
  await shot('99-failure').catch(() => {});
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  const relevant = logs.filter((l) => !/\[vite\]|DevTools|favicon|Failed to load resource/.test(l));
  if (relevant.length) console.log('--- console ---\n' + relevant.slice(0, 25).join('\n'));
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
